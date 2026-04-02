import { ImageElement, Matrix, Point, Rectangle, RenderScene, StitchElement, Color, ThreadRenderOptions, ThreadRenderOptionsUtil, WireframeLayer, AnimationParams, ViewPortAnimationParams, WireframeType, MatrixUtil } from "@melco/renderer"
import { SelectionBoxHit } from "@melco/renderer"
import { UpdateType } from "@melco/renderer/dist/events"

export interface DesignDefinition {
    name: string
    rfm_url: string
    design_matrix?: Matrix
}

export interface ImageDefinition {
    name: string
    url: string
    image_width_pts: number
    origin_off_pts?: Point
}

export const SampleImages = [
  {
    name: "Blank Image",
    url: "",
    image_width_pts: 0
  },
  {
    name: "White TShirt",
    url: "https://melcodemoapps.blob.core.windows.net/rendercache/designcache/WhiteTShirt.png",
    image_width_pts: 254 * 20,
    origin_off_pts: {x: -600, y: 800}
  },
  {
    name: "Blue TShirt",
    url: "https://melcodemoapps.blob.core.windows.net/rendercache/designcache/Blue_Tshirt.jpg",
    image_width_pts: 254 * 20,
  }
] as ImageDefinition[]


export const SampleDesigns = [
    {
        rfm_url: "https://melcodemoapps.blob.core.windows.net/rendercache/designcache/Anchor.rfm",
        name: "Anchor"
    },
    {
        rfm_url: "https://melcodemoapps.blob.core.windows.net/rendercache/designcache/Rainbow.rfm",
        name: "Rainbow"
    },
    {
        rfm_url: "https://melcodemoapps.blob.core.windows.net/testdownload/Test2Lettering.rfm",
        name: "Lettering Test"
    },
    {
        rfm_url: "https://melcodemoapps.blob.core.windows.net/testdownload/arch_oval.rfm",
        name: "Arch Oval"
    }
] as DesignDefinition[]

export const defaultAlphabetPath = "https://melcodemoapps.blob.core.windows.net/testdownload/Astra.alp.rfm"

export enum LoadStatus {
    Loading = "Loading",
    Succeeded = "Succeeded",
    Failed = "Failed"
}
export interface ProductDefinition {
    image_idx: number
    design_idx: number
    image?: ImageElement
    imageLoadStatus?: LoadStatus
    design?: StitchElement
    designLoadStatus?: LoadStatus
}

export interface AnimationVals {
    durationMs: number
    createTime: number
}
export interface ViewDefinition {
    enable_3d: boolean
    enable_twists: boolean
    canvas_rect: Rectangle,
    bgColor: Color,
    animation_params?: AnimationVals
}

export interface DragData {
    dragging: boolean
    drag_transformation: Matrix
    dragHit: SelectionBoxHit
    dragUpdateType: UpdateType
}
export interface SelectionDefinition {
    designSelected: boolean
    selectionRect?: Rectangle
}
export interface EditorDefinition {
    editMode: boolean
    rotationMode: boolean
    dragData: DragData
    selectionData: SelectionDefinition
}

export interface FullState {
    product: ProductDefinition
    view_def: ViewDefinition
    edit_def: EditorDefinition
}
export const initial_state = {
    product: {
        image_idx: 0,
        design_idx: 0
    },
    view_def: {
        enable_3d: true,
        enable_twists: false,
        canvas_width_px: 500,
        canvas_height_px: 500,
        canvas_rect: {llx: -1000, lly: -1000, urx: 1000, ury: 1000},
        bgColor: {
            red: 200,
            green: 200,
            blue: 200,
            alpha: 255
        }
    },
    edit_def: {
        editMode: false,
        rotationMode: false,
        selectionData: {
            designSelected: false
        },
        dragData: {
            dragging: false,
            drag_transformation: MatrixUtil.identityMatrix(),
            dragHit: SelectionBoxHit.hitNothing,
            dragUpdateType: UpdateType.NONE
        }
    }
} as FullState


export function modelToScene(product: ProductDefinition, view_def: ViewDefinition, edit_def: EditorDefinition) {
    let scene = {
        elements: [],
        bgColor: view_def.bgColor
    } as RenderScene
    if (product.image) {
        scene.elements.push(product.image)
    }
    if (product.design) {
        if (edit_def.dragData?.dragging) {
            scene.elements.push({
                ...product.design,
                matrix: MatrixUtil.multiply(edit_def.dragData.drag_transformation, product.design.matrix ? product.design.matrix : MatrixUtil.identityMatrix())
            })
        } else {
            scene.elements.push(product.design)
        }
    }
    return scene
}

export function modelToRenderOptions(view_def: ViewDefinition): ThreadRenderOptions {
    let r = ThreadRenderOptionsUtil.createDefault();
    if (/Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)) {
        r.directionalLight = true;
    }
    r.enable3d = view_def.enable_3d
    r.enableTwists = view_def.enable_twists
    return r;
}

export function modelToWireframeLayer(edit_def: EditorDefinition, se?: StitchElement): WireframeLayer {
    var layer = {
        elements: []
    } as WireframeLayer
    layer.elements.push({
        type: WireframeType.SELECTION_BOX,
        selectedElemIds: edit_def.selectionData?.designSelected && se ? [se.uid] : [],
        display: edit_def.selectionData?.designSelected ? true : false,
        isRotate: edit_def.rotationMode
    })
    if (edit_def.dragData?.dragging && layer.elements[0] && edit_def.selectionData?.selectionRect) {
        layer.elements[0].rect = edit_def.selectionData.selectionRect
        layer.elements[0].matrix = edit_def.dragData?.drag_transformation
    }
    return layer
}

export function createAnimationParams(animation_params?: AnimationVals): AnimationParams | undefined {
    if (animation_params) {
        return {
            viewPortAnimationParams: new ViewPortAnimationParams(animation_params.durationMs, animation_params.createTime)
        }
    }
}