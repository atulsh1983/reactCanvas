import { MODES, PAN_LIMIT } from "./constants/constants";

/**
 * Find a shape in the provided shapes array based on the given coordinates.
 * @param {number} x - X coordinate of the pointer
 * @param {number} y - Y coordinate of the pointer
 * @param {array} shapesArr - Array of shapes to search
 * @returns {object|null} - Shape object if found, otherwise null
 */
export const findShape = (x, y, shapesArr) => {
    for (const item of shapesArr) {
        if (item) {
            if (item.mode === MODES.RECT) {
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
                    return item;
                }
            } else if (item.mode === MODES.CIRCLE) {
                const circle = item.path;
                const [circleX, circleY, radius] = [
                    circle[0][0],
                    circle[0][1],
                    getDistance(circle),
                ];
                const distance = Math.sqrt((x - circleX) ** 2 + (y - circleY) ** 2);
                if (distance <= radius) {
                    return item;
                }
            }
        }
    }
    return null;
};

/**
 * Calculate the distance between two points.
 * @param {array} p1 - First point [x1, y1]
 * @param {array} p2 - Second point [x2, y2]
 * @returns {number} - Distance between the points
 */
export const getDistance = ([[p1X, p1Y], [p2X, p2Y]]) => {
    return Math.sqrt(Math.pow(p1X - p2X, 2) + Math.pow(p1Y - p2Y, 2));
};

/**
 * Export the drawings on the canvas as an HTML file.
 */
export const exportDrawingsAsHTML = () => {
    const canvas = document.getElementById('mainCanvasBoard');
    const drawingData = canvas.toDataURL();

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

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'exported_drawing.html';
    a.click();
    URL.revokeObjectURL(a.href);
};

/**
 * Clear the canvas by resetting its transformation and clearing its content.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
export const clearCanvas = (ctx) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, PAN_LIMIT, PAN_LIMIT);
    ctx.restore();
};
