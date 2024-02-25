export const MODES = {
    PAN: 0,
    RECT: 1,
    CIRCLE: 2,
  };
  
  export const PAN_LIMIT = 3000;

  export const modeButtons = [
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
  