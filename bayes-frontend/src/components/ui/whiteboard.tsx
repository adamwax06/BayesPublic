"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { MathContent } from "./math-content";
import { Button } from "./button";
import { Eraser, Undo, Redo, Download } from "lucide-react";

interface WhiteboardProps {
  className?: string;
  onCheckWork?: (imageData: string) => Promise<void>;
  correctAnswer?: string;
  readOnly?: boolean;
  ocrResult?: { latex?: string; error?: string } | null;
  // New props for feedback visualization
  feedbackItems?: Array<{
    area: string;
    coordinates?: { x: number; y: number };
    issue: string;
    suggestion: string;
    severity: string;
  }>;
  showFeedback?: boolean;
  onClearFeedback?: () => void; // Callback to clear feedback items
  backgroundStyle?: "blank" | "lined" | "grid";
}

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
}

export function Whiteboard({
  className = "",
  onCheckWork,
  readOnly = false,
  ocrResult,
  feedbackItems = [],
  showFeedback = false,
  onClearFeedback,
  backgroundStyle = "blank",
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingPath[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingPath[][]>([]);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const [height, setHeight] = useState(260); // default height in px
  const [isResizing, setIsResizing] = useState(false);
  const minHeight = 200; // minimum height in px
  const maxHeight = 700; // maximum height in px

  // OCR state
  const [isChecking, setIsChecking] = useState(false);
  // Remove local ocrResult state as it will come from props

  // Feedback visualization state
  const [hoveredFeedback, setHoveredFeedback] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // New helper: detect if a given canvas position intersects a feedback item
  const detectFeedbackAtPos = useCallback(
    (
      pos: Point,
    ): { index: number; tooltip: { x: number; y: number } } | null => {
      if (!showFeedback || feedbackItems.length === 0) return null;
      const scaleFactor = 2;
      const dpr = window.devicePixelRatio || 1;
      const conv = scaleFactor * dpr;
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();

      for (let index = 0; index < feedbackItems.length; index++) {
        const feedback = feedbackItems[index];
        if (!feedback.coordinates) continue;
        const coords: any = feedback.coordinates;
        let hit = false;

        if ("width" in coords && "height" in coords) {
          // Rectangle feedback
          const left = coords.x / conv;
          const top = coords.y / conv;
          const width = coords.width / conv;
          const height = coords.height / conv;
          if (
            pos.x >= left &&
            pos.x <= left + width &&
            pos.y >= top &&
            pos.y <= top + height
          ) {
            hit = true;
            if (rect) {
              return {
                index,
                tooltip: {
                  x: rect.left + left + width + 20,
                  y: rect.top + top + height / 2,
                },
              };
            }
          }
        } else {
          // Legacy circular feedback
          const cx = coords.x / conv;
          const cy = coords.y / conv;
          const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
          if (dist <= 35) {
            hit = true;
            if (rect) {
              return {
                index,
                tooltip: { x: rect.left + cx + 50, y: rect.top + cy },
              };
            }
          }
        }

        if (hit && !rect) {
          return { index, tooltip: { x: 0, y: 0 } };
        }
      }
      return null;
    },
    [feedbackItems, showFeedback],
  );

  // Responsive canvas sizing
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const heightPx = container.clientHeight - 12; // account for handle height
      canvas.width = width * dpr;
      canvas.height = heightPx * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = heightPx + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawCanvas();
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
    // eslint-disable-next-line
  }, [paths, height, backgroundStyle]); // Added backgroundStyle dependency

  // Redraw canvas with all paths
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background based on selected style
    if (backgroundStyle === "lined" || backgroundStyle === "grid") {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      // Draw lined or grid background
      ctx.strokeStyle = "#e5e7eb"; // Light gray lines
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = "source-over";

      // Draw horizontal lines (for both lined and grid)
      if (backgroundStyle === "lined" || backgroundStyle === "grid") {
        const lineSpacing = 25 * dpr; // Space between lines
        ctx.beginPath();
        for (let y = lineSpacing; y < canvasHeight; y += lineSpacing) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvasWidth, y);
        }
        ctx.stroke();
      }

      // Draw vertical lines (only for grid)
      if (backgroundStyle === "grid") {
        const gridSpacing = 25 * dpr; // Space between grid lines
        ctx.beginPath();
        for (let x = gridSpacing; x < canvasWidth; x += gridSpacing) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight);
        }
        ctx.stroke();
      }
    }

    // Draw all paths
    paths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });

    // Draw feedback circles if feedback is enabled
    if (showFeedback && feedbackItems.length > 0) {
      ctx.globalCompositeOperation = "source-over";
      feedbackItems.forEach((feedback, index) => {
        if (!feedback.coordinates) return;

        const coords: any = feedback.coordinates;
        const scaleFactor = 2;
        const dpr = window.devicePixelRatio || 1;
        const conv = scaleFactor * dpr;

        const color = "#ef4444";

        // If bounding box provided, draw rectangle highlight
        if ("width" in coords && "height" in coords) {
          const left = coords.x / conv;
          const top = coords.y / conv;
          const width = coords.width / conv;
          const height = coords.height / conv;

          // Semi-transparent fill
          ctx.fillStyle = `${color}33`; // hex with 0.2 alpha approx
          ctx.fillRect(left, top, width, height);

          // Border
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.strokeRect(left, top, width, height);
        } else {
          // Fallback to circle for backward compatibility
          const { x, y } = coords;
          const cx = x / conv;
          const cy = y / conv;
          const radius = 35;

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 8;
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 4;
          ctx.arc(cx, cy, radius - 4, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
          ctx.fill();

          if (feedbackItems.length > 1) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText((index + 1).toString(), cx, cy);
          }
        }
      });
    }
  }, [paths, showFeedback, feedbackItems, backgroundStyle]); // Added backgroundStyle dependency

  // Event position helpers
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findPathAtPosition = (pos: Point): number => {
    // Find the topmost path that contains this position
    for (let i = paths.length - 1; i >= 0; i--) {
      const path = paths[i];
      if (path.points.length < 2) continue;

      // Check if the position is near any line segment in this path
      for (let j = 0; j < path.points.length - 1; j++) {
        const p1 = path.points[j];
        const p2 = path.points[j + 1];

        // Calculate distance from point to line segment
        const distance = distanceToLineSegment(pos, p1, p2);
        const threshold = Math.max(path.width / 2 + 5, 10); // Add some tolerance

        if (distance <= threshold) {
          return i;
        }
      }
    }
    return -1;
  };

  const distanceToLineSegment = (
    point: Point,
    lineStart: Point,
    lineEnd: Point,
  ): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      // Line segment is actually a point
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const startDrawing = (pos: Point) => {
    if (readOnly) return;

    if (isEraser) {
      // Start eraser dragging mode
      setIsDrawing(true);
      // Save current state for undo
      setUndoStack((prev) => [...prev, [...paths]]);
      setRedoStack([]);
      // Erase stroke at starting position
      const pathToRemove = findPathAtPosition(pos);
      if (pathToRemove !== -1) {
        setPaths((prev) => prev.filter((_, index) => index !== pathToRemove));
      }
      return;
    }

    // Drawing mode
    setIsDrawing(true);
    const newPath: DrawingPath = {
      points: [pos],
      color: color,
      width: brushSize,
      isEraser: false,
    };
    setCurrentPath(newPath);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getMousePos(e);
    const hit = detectFeedbackAtPos(pos);
    if (hit) {
      setHoveredFeedback(hit.index);
      setTooltipPosition(hit.tooltip);
      return; // Skip drawing – we're showing feedback tooltip instead
    }
    startDrawing(pos);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    const hit = detectFeedbackAtPos(pos);
    if (hit) {
      setHoveredFeedback(hit.index);
      setTooltipPosition(hit.tooltip);
      return;
    }
    startDrawing(pos);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    const hit = detectFeedbackAtPos(pos);
    if (hit) {
      setHoveredFeedback(hit.index);
      setTooltipPosition(hit.tooltip);
      return;
    }
    startDrawing(pos);
  };

  const continueDrawing = (pos: Point) => {
    // Handle eraser dragging mode
    if (isEraser && isDrawing) {
      // Continue erasing strokes as we drag
      const pathToRemove = findPathAtPosition(pos);
      if (pathToRemove !== -1) {
        setPaths((prev) => prev.filter((_, index) => index !== pathToRemove));
      }
      return;
    }

    // Handle eraser hover (when not dragging)
    if (isEraser && !isDrawing) {
      // Check if hovering over feedback circles
      if (showFeedback && feedbackItems.length > 0) {
        let foundHover = false;
        feedbackItems.forEach((feedback, index) => {
          if (!feedback.coordinates) return;
          const coords: any = feedback.coordinates;
          const scaleFactor = 2;
          const dpr = window.devicePixelRatio || 1;
          const conv = scaleFactor * dpr;

          let isHit = false;
          if ("width" in coords && "height" in coords) {
            // Rectangle hit test
            const left = coords.x / conv;
            const top = coords.y / conv;
            const width = coords.width / conv;
            const height = coords.height / conv;
            if (
              pos.x >= left &&
              pos.x <= left + width &&
              pos.y >= top &&
              pos.y <= top + height
            ) {
              isHit = true;
              // Position tooltip near rectangle
              const canvas = canvasRef.current;
              if (canvas) {
                const rect = canvas.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + left + width + 20,
                  y: rect.top + top + height / 2,
                });
              }
            }
          } else {
            // Circle hit test (legacy)
            const cx = coords.x / conv;
            const cy = coords.y / conv;
            const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
            if (dist <= 35) {
              isHit = true;
              const canvas = canvasRef.current;
              if (canvas) {
                const rect = canvas.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + cx + 50,
                  y: rect.top + cy,
                });
              }
            }
          }

          if (isHit) {
            setHoveredFeedback(index);
            foundHover = true;
          }
        });
        if (!foundHover) {
          setHoveredFeedback(null);
        }
      }
      return;
    }

    if (!isDrawing || !currentPath) {
      // Check if hovering over feedback circles
      if (showFeedback && feedbackItems.length > 0) {
        let foundHover = false;
        feedbackItems.forEach((feedback, index) => {
          if (!feedback.coordinates) return;
          const coords: any = feedback.coordinates;
          const scaleFactor = 2;
          const dpr = window.devicePixelRatio || 1;
          const conv = scaleFactor * dpr;

          let isHit = false;
          if ("width" in coords && "height" in coords) {
            const left = coords.x / conv;
            const top = coords.y / conv;
            const width = coords.width / conv;
            const height = coords.height / conv;
            if (
              pos.x >= left &&
              pos.x <= left + width &&
              pos.y >= top &&
              pos.y <= top + height
            ) {
              isHit = true;
              const canvas = canvasRef.current;
              if (canvas) {
                const rect = canvas.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + left + width + 20,
                  y: rect.top + top + height / 2,
                });
              }
            }
          } else {
            const cx = coords.x / conv;
            const cy = coords.y / conv;
            const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
            if (dist <= 35) {
              isHit = true;
              const canvas = canvasRef.current;
              if (canvas) {
                const rect = canvas.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + cx + 50,
                  y: rect.top + cy,
                });
              }
            }
          }

          if (isHit) {
            setHoveredFeedback(index);
            foundHover = true;
          }
        });
        if (!foundHover) {
          setHoveredFeedback(null);
        }
      }
      return;
    }

    // Drawing mode
    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, pos],
    };
    setCurrentPath(updatedPath);

    // Draw the line segment
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const lastPoint = currentPath.points[currentPath.points.length - 1];
    ctx.beginPath();
    ctx.strokeStyle = updatedPath.color;
    ctx.lineWidth = updatedPath.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    continueDrawing(pos);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    continueDrawing(pos);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    continueDrawing(pos);
  };

  const finishDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (isEraser) {
      // For eraser mode, just stop the erasing process
      // The undo state was already saved when erasing started
      return;
    }

    if (!currentPath) return;
    setPaths((prev) => [...prev, currentPath]);
    setCurrentPath(null);
    setUndoStack((prev) => [...prev, [...paths]]);
    setRedoStack([]);
  };

  const handleMouseUp = () => {
    finishDrawing();
    setHoveredFeedback(null); // Hide tooltip on release
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    finishDrawing();
    setHoveredFeedback(null);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    finishDrawing();
    setHoveredFeedback(null);
  };

  // Tool functions
  const clearCanvas = () => {
    setUndoStack((prev) => [...prev, [...paths]]);
    setPaths([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clear feedback related states
    setHoveredFeedback(null);

    // Clear feedback items if callback is provided
    if (onClearFeedback) {
      onClearFeedback();
    }
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, [...paths]]);
    setPaths(previousState);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, [...paths]]);
    setPaths(nextState);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "whiteboard-drawing.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  // OCR function
  const getCanvasAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";

    // Create a temporary canvas with higher resolution for better OCR
    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return "";

    // Set higher resolution for better OCR recognition
    const scale = 2; // Increase resolution by 2x
    const width = canvas.width;
    const height = canvas.height;

    tempCanvas.width = width * scale;
    tempCanvas.height = height * scale;

    // Scale the context to match the new canvas size
    ctx.scale(scale, scale);

    // Fill with white background first
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw only user paths (exclude feedback circles)
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    paths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width * scale; // scale width too
      ctx.globalCompositeOperation = "source-over";
      ctx.moveTo(path.points[0].x * scale, path.points[0].y * scale);
      path.points.forEach((pt) => ctx.lineTo(pt.x * scale, pt.y * scale));
      ctx.stroke();
    });

    // Convert to JPEG with higher quality for better OCR
    return tempCanvas.toDataURL("image/jpeg", 0.95);
  };

  const handleCheckWork = async () => {
    if (!onCheckWork) return;

    try {
      setIsChecking(true);
      const imageData = getCanvasAsImage();

      if (!imageData) {
        alert("Please draw something first.");
        return;
      }

      console.log("Whiteboard: Sending image data to parent component");
      // Call the provided onCheckWork function which will handle OCR and checking
      await onCheckWork(imageData);
      console.log("Whiteboard: Parent component finished processing");
    } catch (err) {
      console.error("Error checking work:", err);
      alert("Failed to check work. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  // --- Resize handle log ic ---
  const startResize = () => {
    setIsResizing(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    startResize();
  };

  const handleResizeTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    startResize();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newHeight = Math.max(
        minHeight,
        Math.min(maxHeight, e.clientY - rect.top),
      );
      setHeight(newHeight);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const touch = e.touches[0];
      const newHeight = Math.max(
        minHeight,
        Math.min(maxHeight, touch.clientY - rect.top),
      );
      setHeight(newHeight);
    };

    const handleEnd = () => setIsResizing(false);

    // Mouse events
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);

    // Touch events
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [isResizing]);

  // Redraw when paths or height change
  useEffect(() => {
    redrawCanvas();
  }, [paths, redrawCanvas, height]);

  return (
    <div
      ref={containerRef}
      className={`mt-6 mb-2 bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-700 shadow-sm rounded-xl overflow-hidden ${className}`}
      style={{
        minHeight: minHeight,
        height: height,
        maxWidth: "100%",
        position: "relative",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2 px-4 pt-4">
        <span className="font-semibold text-gray-700 dark:text-gray-200 mr-2">
          Whiteboard
        </span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-7 h-7 rounded border cursor-pointer"
          disabled={isEraser || readOnly}
          title="Brush Color"
        />
        <select
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="px-2 py-1 border rounded text-sm"
          disabled={readOnly}
          title="Brush Size"
        >
          <option value={1}>1px</option>
          <option value={2}>2px</option>
          <option value={4}>4px</option>
          <option value={8}>8px</option>
          <option value={12}>12px</option>
        </select>
        <Button
          variant={isEraser ? "default" : "outline"}
          size="icon"
          onClick={() => {
            setIsEraser(!isEraser);
          }}
          className="px-2"
          title="Eraser"
          disabled={readOnly}
        >
          <Eraser className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={undo}
          disabled={undoStack.length === 0 || readOnly}
          className="px-2"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={redo}
          disabled={redoStack.length === 0 || readOnly}
          className="px-2"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={downloadCanvas}
          className="px-2"
          title="Download as PNG"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          className="ml-auto"
          disabled={readOnly}
        >
          Clear All
        </Button>

        {onCheckWork && (
          <div className="ml-2 flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleCheckWork}
              disabled={isChecking}
            >
              {isChecking ? "Checking..." : "Check Work"}
            </Button>

            {/* Remove feedback indicator */}
          </div>
        )}
      </div>
      <div
        className="w-full bg-white dark:bg-gray-950 border rounded-lg overflow-hidden relative mx-auto"
        style={{ height: height - 12, maxWidth: "100%" }}
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full block max-w-full max-h-full ${isEraser ? "cursor-pointer" : "cursor-crosshair"}`}
          style={{ touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* OCR result displfay */}
      {ocrResult && (
        <div
          className={`mt-2 p-3 rounded-lg text-sm ${
            ocrResult.error
              ? "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-200"
              : "bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {ocrResult.error ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="font-medium">OCR Error</p>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="font-medium">OCR Result</p>
              </>
            )}
          </div>

          {ocrResult.error ? (
            <p>{ocrResult.error}</p>
          ) : (
            ocrResult.latex && (
              <>
                <p className="mb-1">Recognized LaTeX:</p>
                <div className="font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto dark:bg-gray-800 dark:border-gray-700">
                  {ocrResult.latex}
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  This is what the OCR system recognized from your handwriting.
                </p>
              </>
            )
          )}
        </div>
      )}

      {/* Feedback tooltip - now using fixed positioning with coordinates relative to viewport */}
      {showFeedback &&
        hoveredFeedback !== null &&
        feedbackItems[hoveredFeedback] && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-sm"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: "translate(0, -50%)",
            }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                <svg
                  className="w-4 h-4 text-red-500 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="font-semibold mb-1">
                  {feedbackItems[hoveredFeedback].area}
                </p>
                <p className="text-sm mb-1 font-semibold text-red-600">
                  Issue:
                </p>
                <MathContent content={feedbackItems[hoveredFeedback].issue} />
                <p className="text-sm mt-2 mb-1 font-semibold text-green-600">
                  Suggestion:
                </p>
                <MathContent
                  content={feedbackItems[hoveredFeedback].suggestion}
                />
              </div>
            </div>
          </div>
        )}

      {/* Feedback guidance message */}
      {showFeedback && feedbackItems.length > 0 && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Red boxes mark mistakes. Hover over them to see feedback.
            </span>
          </div>
        </div>
      )}

      {/* Resize handle outside the canvas wrapper */}
      <div
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
        className="w-full h-3 flex items-center justify-center cursor-ns-resize select-none"
        style={{
          zIndex: 10,
          background: "transparent",
          position: "absolute",
          left: 0,
          bottom: 0,
          touchAction: "none",
        }}
      >
        <div className="w-16 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>
    </div>
  );
}
