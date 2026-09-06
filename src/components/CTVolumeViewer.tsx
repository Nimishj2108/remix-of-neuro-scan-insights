import React, { useEffect, useRef, useState } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import { readImage } from '@itk-wasm/image-io';

interface CTVolumeViewerProps {
  caseId: string;
  apiUrl?: string;
  className?: string;
}

type ViewMode = '3D' | 'AXIAL' | 'CORONAL' | 'SAGITTAL';

const CTVolumeViewer: React.FC<CTVolumeViewerProps> = ({ 
  caseId, 
  apiUrl = (import.meta.env["VITE_CT_API_URL"] as string | undefined) ?? "https://complement-sin-magnet-replace.trycloudflare.com",
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState<string>('WAITING TO LOAD');
  const [metadata, setMetadata] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [sliceIndex, setSliceIndex] = useState<number>(0);
  const [maxSlice, setMaxSlice] = useState<number>(0);
  
  const vtkContext = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0.05, 0.05, 0.05],
    });
    genericRenderWindow.setContainer(containerRef.current);
    genericRenderWindow.resize();

    const renderer = genericRenderWindow.getRenderer();
    const renderWindow = genericRenderWindow.getRenderWindow();
    const interactStyle3D = vtkInteractorStyleTrackballCamera.newInstance();
    const interactStyle2D = vtkInteractorStyleImage.newInstance();
    
    // Default to 3D interaction
    renderWindow.getInteractor().setInteractorStyle(interactStyle3D);
    
    vtkContext.current = {
      genericRenderWindow,
      renderer,
      renderWindow,
      interactStyle3D,
      interactStyle2D,
      volume: null,
      slice: null,
      imageMapper: null,
      vtkImage: null
    };

    const loadVolume = async () => {
      try {
        setLoadingState('LOADING CT VOLUME');
        
        const metaRes = await fetch(`${apiUrl}/cases/${caseId}/ct/metadata`);
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          setMetadata(metaData);
        }

        const response = await fetch(`${apiUrl}/cases/${caseId}/ct/volume`);
        if (!response.ok) throw new Error('Failed to fetch volume');
        
        const arrayBuffer = await response.arrayBuffer();
        setLoadingState('RECONSTRUCTING VOLUME');

        const { image: itkImage } = await readImage(
          new File([arrayBuffer], 'volume.nii.gz')
        );

        const vtkImage = vtkITKHelper.convertItkToVtkImage(itkImage);
        vtkContext.current.vtkImage = vtkImage;
        
        // 3D Volume Setup
        const volMapper = vtkVolumeMapper.newInstance();
        volMapper.setInputData(vtkImage);

        const ctfun = vtkColorTransferFunction.newInstance();
        ctfun.addRGBPoint(-1000, 0.0, 0.0, 0.0);
        ctfun.addRGBPoint(0, 0.1, 0.1, 0.1);
        ctfun.addRGBPoint(40, 0.8, 0.8, 0.8);
        ctfun.addRGBPoint(100, 1.0, 1.0, 1.0);
        ctfun.addRGBPoint(3000, 1.0, 1.0, 1.0);

        const ofun = vtkPiecewiseFunction.newInstance();
        ofun.addPoint(-1000, 0.0);
        ofun.addPoint(0, 0.0);
        ofun.addPoint(20, 0.3);
        ofun.addPoint(40, 0.8);
        ofun.addPoint(100, 1.0);
        ofun.addPoint(3000, 1.0);

        const volume = vtkVolume.newInstance();
        volume.setMapper(volMapper);
        volume.getProperty().setRGBTransferFunction(0, ctfun);
        volume.getProperty().setScalarOpacity(0, ofun);
        volume.getProperty().setInterpolationTypeToLinear();
        volume.getProperty().setShade(true);
        volume.getProperty().setAmbient(0.2);
        volume.getProperty().setDiffuse(0.7);
        volume.getProperty().setSpecular(0.3);
        volume.getProperty().setSpecularPower(8.0);
        
        vtkContext.current.volume = volume;

        // 2D Slice Setup
        const imageMapper = vtkImageMapper.newInstance();
        imageMapper.setInputData(vtkImage);
        // Default Brain CT window/level
        imageMapper.setCustomDisplayExtent([0, 0, 0, 0, 0, 0]); // will be set dynamically
        const slice = vtkImageSlice.newInstance();
        slice.setMapper(imageMapper);
        slice.getProperty().setColorWindow(80);
        slice.getProperty().setColorLevel(40);
        
        vtkContext.current.slice = slice;
        vtkContext.current.imageMapper = imageMapper;

        // Initial setup
        renderer.addVolume(volume);
        renderer.resetCamera();
        renderWindow.render();

        setLoadingState('3D VOLUME READY');
        updateViewMode('3D');
        
      } catch (error) {
        console.error('Error loading CT volume:', error);
        setLoadingState('ERROR LOADING VOLUME');
      }
    };

    loadVolume();

    return () => {
      if (vtkContext.current) {
        vtkContext.current.genericRenderWindow.delete();
        vtkContext.current = null;
      }
    };
  }, [caseId, apiUrl]);

  const updateViewMode = (mode: ViewMode) => {
    if (!vtkContext.current || !vtkContext.current.vtkImage) return;
    
    const { renderer, renderWindow, volume, slice, imageMapper, vtkImage, interactStyle3D, interactStyle2D } = vtkContext.current;
    
    setViewMode(mode);
    renderer.removeAllViewProps();
    
    if (mode === '3D') {
      renderer.addVolume(volume);
      renderWindow.getInteractor().setInteractorStyle(interactStyle3D);
    } else {
      renderer.addViewProp(slice);
      renderWindow.getInteractor().setInteractorStyle(interactStyle2D);
      
      let slicingMode = vtkImageMapper.SlicingMode.K; // AXIAL
      if (mode === 'CORONAL') slicingMode = vtkImageMapper.SlicingMode.J;
      if (mode === 'SAGITTAL') slicingMode = vtkImageMapper.SlicingMode.I;
      
      imageMapper.setSlicingMode(slicingMode);
      
      const extent = vtkImage.getExtent();
      const dims = [extent[1] - extent[0], extent[3] - extent[2], extent[5] - extent[4]];
      
      let maxIdx = dims[2] ?? 0;
      if (mode === 'CORONAL') maxIdx = dims[1] ?? 0;
      if (mode === 'SAGITTAL') maxIdx = dims[0] ?? 0;
      
      setMaxSlice(maxIdx);
      
      // Reset slice to middle
      const midSlice = Math.floor(maxIdx / 2);
      setSliceIndex(midSlice);
      imageMapper.setSlice(midSlice);
      
      // Update camera for 2D slice
      const camera = renderer.getActiveCamera();
      camera.setParallelProjection(true);
      interactStyle2D.setInteractionMode('IMAGE2D');
    }
    
    renderer.resetCamera();
    renderWindow.render();
  };

  useEffect(() => {
    if (vtkContext.current && vtkContext.current.imageMapper && viewMode !== '3D') {
      vtkContext.current.imageMapper.setSlice(sliceIndex);
      vtkContext.current.renderWindow.render();
    }
  }, [sliceIndex, viewMode]);

  const handleResetCamera = () => {
    if (vtkContext.current) {
      vtkContext.current.renderer.resetCamera();
      vtkContext.current.renderWindow.render();
    }
  };

  return (
    <div className={`flex flex-col h-full w-full bg-black text-cyan-400 font-mono relative border border-cyan-800 ${className}`}>
      
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between pointer-events-none">
        <div>
          <h2 className="text-xl font-bold tracking-widest text-cyan-300">NeuroScan {viewMode} View</h2>
          <div className="text-xs text-cyan-600 mt-1 uppercase">
            {loadingState}
          </div>
        </div>
        
        {metadata && (
          <div className="text-right text-xs opacity-80 bg-black/50 p-2 rounded">
            <div>CASE: {caseId}</div>
            <div>MODALITY: {metadata.modality}</div>
            <div>DIMS: {metadata.volume_metrics?.dimensions?.join(' × ')}</div>
            <div>SPACING: {metadata.volume_metrics?.voxel_spacing?.map((s: number) => s.toFixed(2)).join(' × ')}</div>
            {viewMode !== '3D' && <div>SLICE: {sliceIndex} / {maxSlice}</div>}
          </div>
        )}
      </div>

      {/* VTK.js Container */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-crosshair outline-none" />

      {/* Slice Slider (only visible in 2D modes) */}
      {viewMode !== '3D' && maxSlice > 0 && (
        <div className="absolute bottom-16 left-4 right-4 z-10">
          <input 
            type="range" 
            min="0" 
            max={maxSlice} 
            value={sliceIndex} 
            onChange={(e) => setSliceIndex(parseInt(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex gap-2 bg-black/60 pointer-events-auto border-t border-cyan-900/50">
        <button 
          onClick={handleResetCamera}
          className="px-3 py-1 border border-cyan-800 hover:bg-cyan-900/50 text-cyan-400 text-xs transition-colors"
        >
          [RESET]
        </button>
        <button 
          onClick={() => updateViewMode('3D')}
          className={`px-3 py-1 border text-xs transition-colors ${viewMode === '3D' ? 'bg-cyan-800 border-cyan-500 text-white' : 'border-cyan-800 hover:bg-cyan-900/50 text-cyan-400'}`}
        >
          [3D VOLUME]
        </button>
        <button 
          onClick={() => updateViewMode('AXIAL')}
          className={`px-3 py-1 border text-xs transition-colors ${viewMode === 'AXIAL' ? 'bg-cyan-800 border-cyan-500 text-white' : 'border-cyan-800 hover:bg-cyan-900/50 text-cyan-400'}`}
        >
          [AXIAL]
        </button>
        <button 
          onClick={() => updateViewMode('CORONAL')}
          className={`px-3 py-1 border text-xs transition-colors ${viewMode === 'CORONAL' ? 'bg-cyan-800 border-cyan-500 text-white' : 'border-cyan-800 hover:bg-cyan-900/50 text-cyan-400'}`}
        >
          [CORONAL]
        </button>
        <button 
          onClick={() => updateViewMode('SAGITTAL')}
          className={`px-3 py-1 border text-xs transition-colors ${viewMode === 'SAGITTAL' ? 'bg-cyan-800 border-cyan-500 text-white' : 'border-cyan-800 hover:bg-cyan-900/50 text-cyan-400'}`}
        >
          [SAGITTAL]
        </button>
      </div>
    </div>
  );
};

export default CTVolumeViewer;
