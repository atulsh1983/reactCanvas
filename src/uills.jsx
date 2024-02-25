import { MODES} from "./constants/constants";

export const updateData = (data, index) => {
    console.log("index",index);
    return data.map((obj, i) => {
        console.log(obj);
        if (i === index) {
            if (obj.color !== '#1e85e2') {
                return { ...obj, color: '#1e85e2' };
            }
        } else if (obj.color === '#1e85e2') {
            return { ...obj, color: '#000' };
        }
        return obj;
    });
};
export const findShape = (x,y,shapesArr) => {
    console.log("findShape----->");
    // Iterate over each shape in the history to check for intersection
    for (const item of shapesArr) {
        if (!item) {
            console.log("loop-->",item);
            if (item.mode === MODES.RECT) {
                console.log("loop inside  reactangle-->",item);
              // If the shape is a rectangle, check if the pointer coordinates are inside the rectangle
              const rect = item.path;
              const [rectX, rectY, rectWidth, rectHeight] = [
                rect[0][0],
                rect[0][1],
                rect[1][0] - rect[0][0],
                rect[1][1] - rect[0][1],
              ];
              if (
                x >= rectX &&
                x <= rectX + rectWidth &&
                y >= rectY &&
                y <= rectY + rectHeight
              ) {
                return item; // Return the rectangle object if coordinates are inside
              }
            } else if (item.mode === MODES.CIRCLE) {
              // If the shape is a circle, check if the pointer coordinates are within the circle's radius
              const circle = item.path;
              const [circleX, circleY, radius] = [
                circle[0][0],
                circle[0][1],
                getDistance(circle),
              ];
              const distance = Math.sqrt((x - circleX) ** 2 + (y - circleY) ** 2);
              if (distance <= radius) {
                return item; // Return the circle object if coordinates are inside
              }
            }
        }
       
      
      }
      return null; // Return null if no shape is found at the pointer coordinates
}

export const getDistance = ([[p1X, p1Y], [p2X, p2Y]]) => {
    return Math.sqrt(Math.pow(p1X - p2X, 2) + Math.pow(p1Y - p2Y, 2));
  };

 export const exportDrawingsAsHTML = () => {
    const canvas = document.getElementById('mainCanvasBoard'); // Replace 'yourCanvasId' with the actual ID of your canvas element
    const drawingData = canvas.toDataURL(); // Capture drawing as a data URL

    // Create HTML content with the drawing embedded
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Exported Drawing</title>
        </head>
        <body>
            <img src="${drawingData}" alt="Exported Drawing">
        </body>
        </html>
    `;

    // Create a Blob containing the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });

    // Create a download link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'exported_drawing.html';

    // Trigger a click event to initiate the download
    a.click();

    // Cleanup
    URL.revokeObjectURL(a.href);
};
