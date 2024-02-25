import { useEffect, useReducer, useRef, useState } from "react";
import { MODES, PAN_LIMIT } from "../constants/constants";
import { findShape,exportDrawingsAsHTML,getDistance} from "../uills";

let lastPath = [];

const Canvas = ({ settings, ...rest }) => {
  const width = Math.min(rest.width, PAN_LIMIT);
  const height = Math.min(rest.height, PAN_LIMIT);
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

 

  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const selectShape = (shape) => {
    selectedShapeRef.current = shape;
  };
  
  const deselectShape = () => {
    selectedShapeRef.current = null;
  };
  

  const onPointerDown = (e) => {
    prevent(e);
    console.log("onPointerDown---->")
    getContext(settings.current);
    coords.current = [e.clientX, e.clientY];

    const [x, y] = getPoints(e, context.current);
    const shape = findShape(x, y, history.current);
   

    if (settings.current.mode === MODES.PAN) {
      moving.current = true;
      return;
    }

    if(shape){
      selectShape(shape);
      return;
    }

    setDrawing(true);
    draw.current = true;
    const point = getPoints(e, context.current);
    lastPath = [];
    drawModes(settings.current.mode, context.current, point, lastPath);
  };

  const onPointerUp = (e) => {
    prevent(e);
    console.log("on Pointer up------>");
    if (settings.current.mode === MODES.PAN) {
      moving.current = false;
      return;
    }
    setDrawing(false);
    draw.current = false;
    //console.log("lastPath",lastPath);
    if (lastPath.length > 1) {
      history.current.push({
        ...settings.current,
        path: lastPath,
      });
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

  const updatePreview = () => {
    if (preview.current) {
      const style = getPreviewActiveStyles();
      preview.current.style.left = style.left;
      preview.current.style.top = style.top;
    }
  };

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

  const onPointerMove = (e) => {
    prevent(e);
    if (moving.current) return onCanvasMove(e, context.current);
    if (!draw.current) return;
    const point = getPoints(e, context.current);
    drawModes(settings.current.mode, context.current, point, lastPath);
  };

  const drawModes = (mode, ctx, point, path) => {
    // console.log("drawModes------------->");
    // console.log("point--",point);
    // console.log("path--",path);
    // console.log("mode---",mode);  
      switch (mode) {     
        case MODES.RECT:
          if (point) {
           // console.log("--- pass1 ---");
            path.length === 0 ? (path[0] = point) : (path[1] = point);
            previewRect(path, ctx);
          } else {
            //console.log("--- pass2 ---");
            //call below onlt when drap had happended
            if(path.length>1){
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

  const getPoints = (e, ctx) => {
    const { e: dx, f: dy } = ctx.getTransform();
    const rect = canvas.current.getBoundingClientRect();
    return [e.clientX - rect.x - dx, e.clientY - rect.y - dy];
  };

  const previewRect = (path, ctx) => {
    if (path.length < 2) return;
    drawCanvas(ctx);
    drawRect(path, getContext(settings.current, ctx));
  };

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

  const previewCircle = (path, ctx) => {
    if (path.length < 2) return;
    drawCanvas(ctx);
    getContext(settings.current, ctx); // reset context
    drawCircle(path, ctx);
  };



  const drawCircle = (path, ctx) => {
    ctx.beginPath();
    ctx.arc(path[0][0], path[0][1], getDistance(path), 0, 2 * Math.PI);
    ctx.stroke();
  };

  const clearCanvas = (ctx) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, PAN_LIMIT, PAN_LIMIT);
    ctx.restore();
  };

  const drawCanvas = (ctx) => {
    clearCanvas(ctx);
    for (const item of history.current) {
      getContext(item, ctx);
      drawModes(item.mode, ctx, null, item.path);
    }
  };

  const undoCanvas = (e) => {
    prevent(e);
    // console.log("undoCanvas--->");
    // console.log(history.current);
    if (history.current.length === 0) return;
    redoHistory.current.push(history.current.pop());
    drawCanvas(getContext());
    render();
  };

  const redoCanvas = (e) => {
    prevent(e);
    if (redoHistory.current.length === 0) return;
    history.current.push(redoHistory.current.pop());
    drawCanvas(getContext());
    render();
  };

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

 //console.log("history---->", history.current);

  return (
    <>
      <canvas
        ref={canvas}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        id="mainCanvasBoard"
        className={settings.current.mode === MODES.PAN ? "moving" : "drawing"}
      />
      <div
        className="menu"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        aria-disabled={drawing}
      >      
        <button className="button color" type="button">
          <input
            type="color"
            title="change color"
            defaultValue={settings.current.color}
            onChange={changeColor}
          />
        </button>
        <hr />
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
        <hr/>
        <button className="button" onClick={exportDrawingsAsHTML}>
          <img src={"assets/export.svg"} alt="download" title="download" />
        </button>
      </div>
     
    </>
  );
};

export default Canvas;
