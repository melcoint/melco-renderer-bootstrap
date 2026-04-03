import { GLRenderer, ImageElement, Matrix, MatrixUtil, StitchElement, ViewPortUtil } from "@melco/renderer"
import { DesignDefinition, LoadStatus, ImageDefinition, FullState, SampleDesigns, SampleImages } from "./state"
import { GenericDocumentAction, actions } from "./actions"

export async function downloadDesignAsync(renderer: GLRenderer, design_idx: number, design: DesignDefinition, dispatch: React.Dispatch<GenericDocumentAction>) {
    try {
        dispatch(actions.DeselectAll({}))
        dispatch(actions.ChangeDesignDownloadStatus({idempotent_idx: design_idx, status: LoadStatus.Loading}))
        const se = await renderer.getFactory().createDesignElement({designMetadataUrl: design.rfm_url})
        const metadata = renderer.getFactory().elementUtil.getStitchElementMetadataIfLoaded(se)
        if (metadata) {
            if (metadata.originalColors && metadata.originalColors.length > 0) {
                se.colors = metadata.originalColors
            }
            if (metadata.originalSubElements && metadata.originalSubElements.length > 0) {
                se.subElements = metadata.originalSubElements
            }
            if (metadata.originalLetteringParams && metadata.originalLetteringParams.length > 0) {
                se.letteringParams = metadata.originalLetteringParams
            }
        }
        dispatch(actions.ChangeDesignDownloadStatus({idempotent_idx: design_idx, designElement: se, status: LoadStatus.Succeeded}))
    } catch {
        dispatch(actions.ChangeDesignDownloadStatus({idempotent_idx: design_idx, status: LoadStatus.Failed}))
    }
}

export async function downloadImageAsync(renderer: GLRenderer, image_idx: number, image: ImageDefinition, state: FullState, dispatch: React.Dispatch<GenericDocumentAction>) {
    if (image.url.length == 0) {
        dispatch(actions.ChangeImageDownloadStatus({idempotent_idx: image_idx, status: LoadStatus.Succeeded}))
        return
    }
    try {
        dispatch(actions.ChangeImageDownloadStatus({idempotent_idx: image_idx, status: LoadStatus.Loading}))
        const im = await renderer.getFactory().createImageElement({imageUrl: image.url})
        const metadata = renderer.getFactory().elementUtil.getImageMetadataIfLoaded(im)
        if (metadata && im) {
            var width = image.image_width_pts
            var height = metadata.ydim / metadata.xdim * width
            var centerx = 0
            var centery = 0
            if (image.origin_off_pts) {
                centerx = -image.origin_off_pts.x
                centery = -image.origin_off_pts.y
            }
            im.rect = {
                llx: centerx - width/2,
                lly: centery - height/2,
                urx: centerx + width/2,
                ury: centery + height/2
            }
        }
        dispatch(actions.ChangeImageDownloadStatus({idempotent_idx: image_idx, imageElement: im, status: LoadStatus.Succeeded}))
        ZoomToImage(renderer, state, im, dispatch)
    } catch {
        dispatch(actions.ChangeImageDownloadStatus({idempotent_idx: image_idx, status: LoadStatus.Failed}))
    }
}

export async function predownloadAlphabet(renderer: GLRenderer, alphabet_url: string) {
    return await renderer.getFactory().createAlphabet(alphabet_url)
}

export async function redownloadAll(renderer: GLRenderer, state: FullState, dispatch: React.Dispatch<GenericDocumentAction>) {
    let p1 = downloadDesignAsync(renderer, state.product.design_idx, SampleDesigns[state.product.design_idx], dispatch)  
    let p2 = downloadImageAsync(renderer, state.product.image_idx, SampleImages[state.product.image_idx], state, dispatch)
    await Promise.all([p1, p2]) 
}

export function ZoomToFit(renderer: GLRenderer, state: FullState, canvas_width: number, canvas_height: number, dispatch: React.Dispatch<GenericDocumentAction>, zoomToFitAnimationDurationMs?: number) {
    const design = state.product.design
    if (design) {
        const maxdpi = 0
        const margin = 10
        let designRect = renderer.getFactory().elementUtil.calcRectForTransform(design, design.matrix ? design.matrix : MatrixUtil.identityMatrix());
        let newRect = ViewPortUtil.zoomToFit(designRect, canvas_width, canvas_height, maxdpi, margin);
        dispatch(actions.ChangeViewPort({value: newRect, animationDurationMs: zoomToFitAnimationDurationMs, currTime: Date.now()}))
    }
}

export function ZoomToImage(renderer: GLRenderer, state: FullState, image: ImageElement, dispatch: React.Dispatch<GenericDocumentAction>, zoomToFitAnimationDurationMs?: number) {
    if (image) {
        const margin = 10
        let imageRect = renderer.getFactory().elementUtil.calcRectForTransform(image, image.matrix ? image.matrix : MatrixUtil.identityMatrix());
        let width = (imageRect.urx - imageRect.llx) + 2 * margin
        let height = (imageRect.ury - imageRect.lly) + 2 * margin
        const centerx = .5 * (imageRect.urx + imageRect.llx)
        const centery = .5 * (imageRect.ury + imageRect.lly)
        const scale1 = width / (state.view_def.canvas_rect.urx - state.view_def.canvas_rect.llx)
        const scale2 = height / (state.view_def.canvas_rect.ury - state.view_def.canvas_rect.lly)
        const scale = Math.max(scale1, scale2)
        width = (state.view_def.canvas_rect.urx - state.view_def.canvas_rect.llx) * scale
        height = (state.view_def.canvas_rect.ury - state.view_def.canvas_rect.lly) * scale
        let newRect = {
            llx: centerx - width / 2,
            lly: centery - height / 2,
            urx: centerx + width / 2,
            ury: centery + height / 2
        }
        dispatch(actions.ChangeViewPort({value: newRect, animationDurationMs: zoomToFitAnimationDurationMs, currTime: Date.now()}))
    }
}

export async function recalcSelectionBox(renderer: GLRenderer, se: StitchElement, dispatch: React.Dispatch<GenericDocumentAction>, matrix?: Matrix) {
    await renderer.getFactory().elementUtil.ensureElementLoaded(se)
    const r = renderer.getFactory().elementUtil.calcRectForTransform(se, matrix ? matrix : (se.matrix ? se.matrix : MatrixUtil.identityMatrix()))
    dispatch(actions.ChangeSelectionRectangle({ selectionRectangle: r})) 
}
