import { useEffect, useReducer, useRef, useState } from "react";
import { MODES, PAN_LIMIT } from "../constants/constants";
import {
  findShape,
  exportDrawingsAsHTML,
  getDistance,
  clearCanvas,
  getPoints,
} from "../utils";

// Keep track of the last drawn path
let lastPath = [];

/**
 * Canvas component for drawing shapes and managing user interactions.
 * @param {Object} props - Component props.
 * @param {Object} props.settings - Settings object.
 * @param {number} props.width - Canvas width.
 * @param {number} props.height - Canvas height.
 * @returns {JSX.Element} Canvas component.
 */
const Canvas = ({ settings, ...rest }) => {
  const width = Math.min(rest.width, PAN_LIMIT);
  const height = Math.min(rest.height, PAN_LIMIT);

  // State and refs initialization
  const [drawing, setDrawing] = useState(false);
  const [, render] = useReducer((prev) => !prev, false);
  const canvas = useRef(null);
  const context = useRef(null);
  const preview = useRef(null);
  const draw = useRef(false);
  const coords = useRef([0, 0]);
  const history = useRef([]);
  const redoHistory = useRef([]);
  const moving = useRef(false);
  const selectedShapeRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartCoords = useRef([0, 0]);
 

  /**
   * Prevents default event behavior.
   * @param {Event} e - Event object.
   */
  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Selects a shape on the canvas.
   * @param {Object} shape - Shape object.
   */
  const selectShape = (shape) => {
    history.current.forEach((item) => {
      item.selected = item === shape; // Set selected flag for the clicked shape
    });
    drawCanvas(getContext()); // Trigger a redraw of the canvas
  };

  /**
   * Event handler for pointer down event.
   * @param {Event} e - Pointer event.
   */
  const onPointerDown = (e) => {
    prevent(e);
    getContext(settings.current);
    coords.current = [e.clientX, e.clientY];
    const [x, y] = getPoints(e, context.current, canvas.current);
    const shape = findShape(x, y, history.current);
    // Handle pan mode
    if (settings.current.mode === MODES.PAN) {
      moving.current = true;
      return;
    }
    // Handle shape selection
    if (shape) {     
      canvas.current.style.cursor = "move";
      selectedShapeRef.current = shape;
      isDragging.current = true;
      dragStartCoords.current = [x, y];
      selectShape(shape); // Highlight the selected shape      
      return;
    } else {   
      selectShape("");
    }
    // Handle drawing mode
    setDrawing(true);
    draw.current = true;
    const point = getPoints(e, context.current, canvas.current);
    lastPath = [];
    drawModes(settings.current.mode, context.current, point, lastPath);
  };

  /**
   * Event handler for pointer up event.
   * @param {Event} e - Pointer event.
   */
  const onPointerUp = (e) => {
    prevent(e);   
    // Handle pan mode
    if (settings.current.mode === MODES.PAN) {
      moving.current = false;
      return;
    }
    // Handle shape selection
    const selectedShape = selectedShapeRef.current;
    if (isDragging.current && selectedShape) {
      isDragging.current = false;
      selectedShapeRef.current = null; // Reset selected shape
      canvas.current.style.cursor = "auto"; // Reset cursor to default
    }

    setDrawing(false);
    draw.current = false;
    // Save drawing to history
    if (lastPath.length > 1) {
      history.current.push({
        ...settings.current,
        path: lastPath,
      });
      const newSape = history.current[history.current.length - 1];
      selectShape(newSape);

      redoHistory.current = [];
      lastPath = [];
      drawCanvas(getContext());
    }
  };

  const getPreviewActiveStyles = () => {
    const styles = {
      width: (width * 100) / PAN_LIMIT + "%",
      height: (height * 100) / PAN_LIMIT + "%",
    };
    if (!context.current) return styles;
    const { e, f } = getContext().getTransform();
    styles.left = (100 - e * 100) / PAN_LIMIT + "%";
    styles.top = (100 - f * 100) / PAN_LIMIT + "%";
    return styles;
  };
  /**
   * Updates the preview style based on canvas transformation.
   */
  const updatePreview = () => {
    if (preview.current) {
      const style = getPreviewActiveStyles();
      preview.current.style.left = style.left;
      preview.current.style.top = style.top;
    }
  };
  /**
   * Handles canvas movement.
   * @param {Event} e - Pointer event.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context.
   */
  const onCanvasMove = (e, ctx) => {
    const [x1, y1] = coords.current;
    const { clientX: x2, clientY: y2 } = e;
    let dx = x2 - x1;
    let dy = y2 - y1;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    const { e: tdx, f: tdy } = ctx.getTransform();
    const ntdx = Math.min(Math.max(-(PAN_LIMIT - width), tdx + dx), 0);
    const ntdy = Math.min(Math.max(-(PAN_LIMIT - height), tdy + dy), 0);
    ctx.setTransform(1, 0, 0, 1, ntdx, ntdy);
    drawCanvas(ctx);
    coords.current = [x2, y2];
    updatePreview();
  };
  /**
   * Event handler for pointer move event.
   * @param {Event} e - Pointer event.
   */
  const onPointerMove = (e) => {
    prevent(e);
    if (isDragging.current && selectedShapeRef.current) {
      const [x, y] = getPoints(e, context.current, canvas.current);
      const [startX, startY] = dragStartCoords.current;
      const dx = x - startX;
      const dy = y - startY;
      selectedShapeRef.current.path = selectedShapeRef.current.path.map(
        ([px, py]) => [px + dx, py + dy]
      );
      dragStartCoords.current = [x, y]; // Update the drag start coordinates

      drawCanvas(getContext());
    } else {
      if (moving.current) return onCanvasMove(e, context.current);
      if (!draw.current) return;
      const point = getPoints(e, context.current, canvas.current);
      drawModes(settings.current.mode, context.current, point, lastPath);
    }
  };
  /**
   * Draws shapes based on the current drawing mode.
   * @param {string} mode - Drawing mode.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context.
   * @param {number[]} point - Point coordinates.
   * @param {number[][]} path - Path coordinates.
   */
  const drawModes = (mode, ctx, point, path) => {
    switch (mode) {
      case MODES.RECT:
        if (point) {
          path.length === 0 ? (path[0] = point) : (path[1] = point);
          previewRect(path, ctx);
        } else {
          if (path.length > 1) {
            drawRect(path, ctx);
          }
        }
        break;
      case MODES.CIRCLE:
        if (point) {
          path.length === 0 ? (path[0] = point) : (path[1] = point);
          previewCircle(path, ctx);
        } else {
          drawCircle(path, ctx);
        }
        break;
      default:
        return;
    }
  };
  /**
   * Gets the canvas 2D rendering context with applied settings.
   * @param {Object} config - Drawing configuration.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context.
   * @returns {CanvasRenderingContext2D} Canvas 2D context.
   */
  const getContext = (config, ctx) => {
    if (!context.current) {
      context.current = canvas.current.getContext("2d");
    }
    if (!ctx) ctx = context.current;
    if (config) {
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.stroke;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    return ctx;
  };
  /**
   * Previews a rectangle shape on the canvas.
   * @param {number[][]} path - Array of two points representing the rectangle.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
   */
  const previewRect = (path, ctx) => {
    if (path.length < 2) return;
    drawCanvas(ctx);
    drawRect(path, getContext(settings.current, ctx));
  };
  /**
   * Draws a rectangle shape on the canvas.
   * @param {number[][]} path - Array of two points representing the rectangle.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
   */
  const drawRect = (path, ctx) => {
    ctx.beginPath();
    ctx.rect(
      path[0][0],
      path[0][1],
      path[1][0] - path[0][0],
      path[1][1] - path[0][1]
    );
    ctx.stroke();
  };
  /**
   * Previews a circle shape on the canvas.
   * @param {number[][]} path - Array of two points representing the circle.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
   */
  const previewCircle = (path, ctx) => {
    if (path.length < 2) return;
    drawCanvas(ctx);
    getContext(settings.current, ctx); // reset context
    drawCircle(path, ctx);
  };
  /**
   * Draws a circle shape on the canvas.
   * @param {number[][]} path - Array of two points representing the circle.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
   */
  const drawCircle = (path, ctx) => {
    ctx.beginPath();
    ctx.arc(path[0][0], path[0][1], getDistance(path), 0, 2 * Math.PI);
    ctx.stroke();
  };
  /**
   * Draws all shapes on the canvas.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
   */
  const drawCanvas = (ctx) => {
    clearCanvas(ctx);
    for (const item of history.current) {
      getContext(item, ctx);
      if (item.selected) {
        // Draw a border around the selected shape
        ctx.strokeStyle = "red"; // Border color
        ctx.lineWidth = 3; // Border width
        ctx.setLineDash([5, 5]);
      } else {
        // Reset stroke color and line width for other shapes
        ctx.strokeStyle = settings.current.color; // Default stroke color
        ctx.lineWidth = settings.current.stroke; // Default line width
        ctx.setLineDash([]);
      }
      drawModes(item.mode, ctx, null, item.path);
    }
  };
  /**
   * Undoes the last canvas action.
   * @param {Event} e - Pointer event.
   */
  const undoCanvas = (e) => {
    prevent(e);
    if (history.current.length === 0) return;
    redoHistory.current.push(history.current.pop());
    drawCanvas(getContext());
    render();
  };

  /**
   * Redoes the last undone canvas action.
   * @param {Event} e - Pointer event.
   */
  const redoCanvas = (e) => {
    prevent(e);
    if (redoHistory.current.length === 0) return;
    history.current.push(redoHistory.current.pop());
    drawCanvas(getContext());
    render();
  };

  /**
   * Sets the drawing mode.
   * @param {string} mode - Drawing mode.
   * @returns {Function} Event handler function.
   */
  const setMode = (mode) => (e) => {
    settings.current.mode = mode;
    render();
  };

  useEffect(() => {
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointermove", onPointerMove);
    getContext().setTransform(
      1,
      0,
      0,
      1,
      -(PAN_LIMIT - width) / 2,
      -(PAN_LIMIT - height) / 2
    );
    drawCanvas(getContext());
    updatePreview();
    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointermove", onPointerMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const changeColor = (e) => {  
    settings.current.color = e.target.value;
    e.target.blur();
  };

  const modeButtons = [
    {
      mode: MODES.PAN,
      title: "move",
      icon: "move.svg",
    },
    {
      mode: MODES.RECT,
      title: "rectangle",
      icon: "rectangle.svg",
    },
    {
      mode: MODES.CIRCLE,
      title: "circle",
      icon: "circle.svg",
    },
  ];

 

  return (
    <>
      {/* Canvas element */}
      <canvas
        ref={canvas}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        id="mainCanvasBoard"
        className={settings.current.mode === MODES.PAN ? "moving" : "drawing"}
      />
      {/* Menu buttons */}
      <div
        className="menu"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        aria-disabled={drawing}
      >
        {/* Color picker */}
        <button className="button color" type="button">
          <input
            type="color"
            title="change color"
            defaultValue={settings.current.color}
            onChange={changeColor}
          />
        </button>
        <hr />
        {/* Mode buttons */}
        {modeButtons.map((btn) => (
          <button
            className="button"
            key={btn.mode}
            type="button"
            onClick={setMode(btn.mode)}
            aria-pressed={settings.current.mode === btn.mode}
          >
            <img src={"assets/" + btn.icon} alt={btn.title} title={btn.title} />
          </button>
        ))}
        <hr />
        {/* Undo and redo buttons */}
        <button
          className="button"
          type="button"
          onClick={undoCanvas}
          disabled={history.current.length === 0}
        >
          <img src="assets/undo.svg" alt="undo" title="undo" />
        </button>
        <button
          className="button"
          type="button"
          onClick={redoCanvas}
          disabled={redoHistory.current.length === 0}
        >
          <img src="assets/redo.svg" alt="redo" title="red" />
        </button>
        <hr />
        {/* Export button */}
        <button className="button" onClick={exportDrawingsAsHTML}>
          <img src={"assets/export.svg"} alt="download" title="download" />
        </button>
      </div>
    </>
  );
};

export default Canvas;
