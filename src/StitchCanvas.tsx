import { useEffect, useRef } from 'react';
import { createRenderer, createSceneManager, RenderScene, WireframeLayer, RectangleUtil, Rectangle, GLRenderer, ThreadRenderOptions, ElementFactory, AnimationParams, ThreadRenderOptionsUtil, RenderSceneUtil } from "@melco/renderer";

function initThreadRenderOptions(): ThreadRenderOptions {
  let r = ThreadRenderOptionsUtil.createDefault();
  if (/Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)) {
    r.directionalLight = true;
  }
  return r;
}
const defaultRenderOptions = initThreadRenderOptions();
const emptyScene = RenderSceneUtil.createEmptyScene();
const emptyRect = RectangleUtil.emptyRect();

async function init(canvasId: string, width: number, height: number, dpi: number, viewPort: Rectangle,
  _wasmUrlOverride?: string, enableMultiSampling?: boolean): Promise<GLRenderer> {
  // Canvas should be added to DOM before attach webgl context
  const sceneManager = await createSceneManager();
  let renderer = await createRenderer(canvasId, sceneManager, enableMultiSampling);

  let widthp = width / dpi * 254;
  let heightp = height / dpi * 254;
  viewPort = !RectangleUtil.empty(viewPort) ? viewPort : RectangleUtil.createRect(-widthp / 2, -heightp / 2, widthp / 2, heightp / 2);
  renderer.setViewPort(viewPort);
  renderer.redraw();
  return renderer;
}

export interface CanvasProps {
  /** the unique id to use for canvas component (defaults to 'canvas') */
  canvasId?: string;
  /** callback called when renderer created and webassembly downloaded, parameter for factory to create elements passed in */
  initCallback?: (f: ElementFactory | null, canvas?: HTMLElement, renderer?: GLRenderer) => void;
  /** scene to render */
  scene?: RenderScene;
  /** viewPort for canvas defaults to around origin with 96 dpi, modify this for panning/zooming */
  viewPort?: Rectangle;
  /** parameters for rendering embroidery */
  renderOptions?: ThreadRenderOptions;
  /** the width of canvas (string which gets passed to width style for canvas ('100%', '600', etc.)) */
  canvasWidth?: string;
  /** the height of canvas (string which gets passed to height style for canvas ('100%', '600', etc.)) */
  canvasHeight?: string;
  /** the wireframe layer to display on top of design (optional) */
  wireframeLayer?: WireframeLayer;
  /** Optional animation params to use when rendering */
  animationParams?: AnimationParams;
  /** Optional override url to download wasm file from, if undefined downloads from same directory as .js file */
  wasmUrlOverride?: string;
  /** Optional parameter to enable multi sampling in canvas (defaults to true) */
  enableMultiSampling?: boolean;
}
/**
 * StitchCanvas react component
 */
const StitchCanvas = ({ canvasId = 'canvas', initCallback = (_: ElementFactory | null) => { },
  scene = emptyScene, viewPort = emptyRect,
  renderOptions = defaultRenderOptions,
  canvasWidth = '100%', canvasHeight = '100%', wireframeLayer = undefined as (WireframeLayer | undefined),
  animationParams = undefined as (AnimationParams | undefined), wasmUrlOverride = undefined as (string | undefined),
  enableMultiSampling = undefined as (boolean | undefined) }: CanvasProps) => {
  const renderer = useRef<GLRenderer | null>(null);
  const canvasDOM = useRef<HTMLCanvasElement | null>(null);

  const viewPortAnimation = animationParams ? animationParams.viewPortAnimationParams : undefined;

  useEffect(() => {
    let isMounted = true;
    async function initRenderer() {
      if (canvasDOM.current) {
        let r = await init(canvasId, canvasDOM.current.clientWidth, canvasDOM.current.clientHeight, 96, viewPort, wasmUrlOverride, enableMultiSampling);
        if (isMounted) {
          renderer.current = r;
          r.updateRenderScene(scene);
          r.setWireframeElements(wireframeLayer);
          r.threadRenderOptions = renderOptions;
          initCallback(r.getFactory(), canvasDOM.current, r);
        } else {
          r.destroy();
        }
      }
    }
    initRenderer();
    return () => {
      isMounted = false;
      initCallback(null);
      if (renderer.current) {
        renderer.current.destroy();
        renderer.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (renderer.current && scene) {
      renderer.current.updateRenderScene(scene);
      renderer.current.redraw();
    }
  }, [scene]);

  useEffect(() => {
    if (renderer.current && viewPort) {
      renderer.current.setViewPort(viewPort, viewPortAnimation);
      renderer.current.redraw();
    }
  }, [viewPort, viewPortAnimation]);

  useEffect(() => {
    if (renderer.current && renderOptions) {
      renderer.current.threadRenderOptions = renderOptions;
      renderer.current.redraw();
    }
  }, [renderOptions]);

  useEffect(() => {
    if (renderer.current && wireframeLayer) {
      renderer.current.setWireframeElements(wireframeLayer);
      renderer.current.redrawWireframe();
    }
  }, [wireframeLayer]);


  return (
    <canvas ref={canvasDOM} id={canvasId} style={{ zIndex: 10, width: canvasWidth, height: canvasHeight, position: 'absolute', padding: 0 }}> </canvas>
  );
}

export default StitchCanvas;
