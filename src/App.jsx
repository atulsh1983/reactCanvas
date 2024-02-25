import { useRef } from "react";
import Canvas from "./components/Canvas";
import { MODES } from "./constants/constants";
import { useWindowSize } from "./hooks/useWindowSize";
import "./App.css";

function App() {
  const settings = useRef({
    stroke: 1,
    color: "#000",
    mode: MODES.RECT,
  });

  const size = useWindowSize();

  return (
    <div className="app">
      <div className="canvas-container">
        <Canvas {...size} settings={settings} />
      </div>
    </div>
  );
}

export default App;
