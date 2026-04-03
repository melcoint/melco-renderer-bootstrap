import {
  createRenderer,
  createSceneManager,
  ViewPortUtil,
} from "@melco/renderer";

let createCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.id = "canvas1";
  canvas.width = 500;
  canvas.height = 500;
  canvas.style.display = "block";
  return canvas;
};
let initApp = async () => {
  // create simple canvas element and add to DOM
  const canvas = createCanvas();
  document.body.appendChild(canvas);

  // Canvas should be added to DOM before attach webgl context
  let sceneManager = await createSceneManager();
  let renderer = await createRenderer(canvas, sceneManager);
  let elementFactory = renderer.getFactory();
  let scene = {};

  // download a design file
  let url =
    "https://melcodemoapps.blob.core.windows.net/demo-assets/Anchor.rfm";

  let design = await elementFactory.createDesignElement({
    designMetadataUrl: url,
  });
  let boundingBox =
    elementFactory.elementUtil.getStitchElementMetadataIfLoaded(
      design,
    ).originalBoundingBox;

  // create scene with design and background color
  scene.elements = [design];
  scene.bgColor = { red: 200, green: 200, blue: 200, alpha: 255 };
  let viewPort = ViewPortUtil.zoomToFit(boundingBox, 500, 500, 96, 10);
  renderer.setViewPort(viewPort);
  console.log(scene);
  renderer.updateRenderScene(scene);
  renderer.redraw();

  // store in global state
  window["render_app_data"] = {
    renderer: renderer,
  };

  console.log("Successfully initialized");
};

initApp();
