// ============================================
// Tutorial Overlay Component
// Apple-style spotlight animations for guided tutorial
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/tutorialStore';
import { useShopStore } from '../store/shopStore';
import { resetTutorialLedger } from '../lib/tauri';
import { X, ChevronRight, MousePointerClick } from 'lucide-react';

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Calculate optimal tooltip position that doesn't overlap the spotlight
function calculateTooltipPosition(
  spotlightRect: SpotlightRect | null,
  position: string | undefined,
  windowWidth: number,
  windowHeight: number,
  isCompact?: boolean,
  offset?: { x?: number; y?: number }
): { x: number; y: number; placement: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'corner' | 'top-left' } {
  const tooltipWidth = isCompact ? 220 : 380;
  const tooltipHeight = isCompact ? 80 : 180;
  const margin = 24;
  const edgePadding = 20;
  const offsetX = offset?.x || 0;
  const offsetY = offset?.y || 0;

  // Top-left corner position (for map and other pages where right side has UI)
  if (position === 'top-left') {
    return {
      x: edgePadding,
      y: 80, // Below header
      placement: 'top-left'
    };
  }

  // Corner position (bottom-right, out of the way)
  if (position === 'corner') {
    return {
      x: windowWidth - tooltipWidth - edgePadding,
      y: windowHeight - tooltipHeight - 80, // Above bottom nav
      placement: 'corner'
    };
  }

  // Centered (no spotlight or center position)
  if (!spotlightRect || position === 'center') {
    return { 
      x: windowWidth / 2, 
      y: windowHeight / 2, 
      placement: 'center' 
    };
  }

  // Calculate available space in each direction
  const spaceTop = spotlightRect.y - edgePadding;
  const spaceBottom = windowHeight - (spotlightRect.y + spotlightRect.height) - edgePadding;
  const spaceLeft = spotlightRect.x - edgePadding;
  const spaceRight = windowWidth - (spotlightRect.x + spotlightRect.width) - edgePadding;

  // Determine best placement based on available space and preference
  let placement: 'top' | 'bottom' | 'left' | 'right' = position as any || 'bottom';
  
  // Override if preferred position doesn't have enough space
  const canFitTop = spaceTop >= tooltipHeight + margin;
  const canFitBottom = spaceBottom >= tooltipHeight + margin;
  const canFitLeft = spaceLeft >= tooltipWidth + margin;
  const canFitRight = spaceRight >= tooltipWidth + margin;

  // Smart placement: prefer the position with most space if preferred doesn't fit
  if (placement === 'top' && !canFitTop) {
    placement = canFitBottom ? 'bottom' : canFitRight ? 'right' : canFitLeft ? 'left' : 'bottom';
  } else if (placement === 'bottom' && !canFitBottom) {
    placement = canFitTop ? 'top' : canFitRight ? 'right' : canFitLeft ? 'left' : 'top';
  } else if (placement === 'left' && !canFitLeft) {
    placement = canFitRight ? 'right' : canFitBottom ? 'bottom' : canFitTop ? 'top' : 'right';
  } else if (placement === 'right' && !canFitRight) {
    placement = canFitLeft ? 'left' : canFitBottom ? 'bottom' : canFitTop ? 'top' : 'left';
  }

  // Calculate position based on placement
  let x = 0;
  let y = 0;
  const spotCenterX = spotlightRect.x + spotlightRect.width / 2;
  const spotCenterY = spotlightRect.y + spotlightRect.height / 2;

  switch (placement) {
    case 'top':
      x = spotCenterX - tooltipWidth / 2;
      y = spotlightRect.y - margin - tooltipHeight;
      break;
    case 'bottom':
      x = spotCenterX - tooltipWidth / 2;
      y = spotlightRect.y + spotlightRect.height + margin;
      break;
    case 'left':
      x = spotlightRect.x - margin - tooltipWidth;
      y = spotCenterY - tooltipHeight / 2;
      break;
    case 'right':
      x = spotlightRect.x + spotlightRect.width + margin;
      y = spotCenterY - tooltipHeight / 2;
      break;
  }

  // Keep tooltip on screen
  x = Math.max(edgePadding, Math.min(x + offsetX, windowWidth - tooltipWidth - edgePadding));
  y = Math.max(edgePadding, Math.min(y + offsetY, windowHeight - tooltipHeight - edgePadding));

  return { x, y, placement };
}

export function TutorialOverlay() {
  const navigate = useNavigate();
  const { isActive, currentStepId, getCurrentStep, nextStep, endTutorial } = useTutorialStore();
  const setFilter = useShopStore((state) => state.setFilter);
  const setHasUnsavedChanges = useShopStore((state) => state.setHasUnsavedChanges);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [fixedSpotlightRects, setFixedSpotlightRects] = useState<SpotlightRect[]>([]);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; placement: string }>({ x: 0, y: 0, placement: 'center' });
  const [showContent, setShowContent] = useState(false);
  const [isHoveringClose, setIsHoveringClose] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const currentStep = getCurrentStep();

  // Handle exiting the tutorial - reset ledger and go home
  const handleExitTutorial = useCallback(async () => {
    endTutorial();
    setHasUnsavedChanges(false); // Clear unsaved changes flag
    try {
      await resetTutorialLedger();
    } catch (err) {
      console.error('Failed to reset tutorial ledger:', err);
    }
    navigate('/');
  }, [endTutorial, navigate, setHasUnsavedChanges]);

  // Wrapper for nextStep that handles cleanup before advancing
  const handleNextStep = useCallback(() => {
    // Clear search if this step requires it
    if (currentStep?.clearSearchOnExit) {
      setFilter({ searchQuery: '' });
    }
    nextStep();
  }, [currentStep, nextStep, setFilter]);

  // Handle Escape key to close tutorial
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        handleExitTutorial();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleExitTutorial]);

  // Calculate spotlight position based on target element
  const updateSpotlight = useCallback(() => {
    // For exploration steps (interactive with no target), use corner position
    const isExplorationStep = currentStep?.isInteractive && !currentStep?.target;
    
    if (!currentStep?.target) {
      setSpotlightRect(null);
      // Use corner position for exploration steps, center for others
      if (isExplorationStep) {
        const tooltipWidth = 300;
        const tooltipHeight = 140;
        const margin = 24;
        
        // Check if step specifies top-left position
        if (currentStep?.position === 'top-left') {
          setTooltipPos({ 
            x: margin, 
            y: 80, // Below header
            placement: 'top-left' 
          });
        } else {
          setTooltipPos({ 
            x: window.innerWidth - tooltipWidth - margin, 
            y: window.innerHeight - tooltipHeight - 90, // Above bottom nav
            placement: 'corner' 
          });
        }
      } else {
        setTooltipPos({ 
          x: window.innerWidth / 2, 
          y: window.innerHeight / 2, 
          placement: 'center' 
        });
      }
      return;
    }

    const element = document.querySelector(currentStep.target);
    if (!element) {
      setTimeout(updateSpotlight, 100);
      return;
    }

    const rect = element.getBoundingClientRect();
    const basePadding = 12;
    const extraPadding = currentStep.spotlightPadding || {};
    
    // Start with main element bounds
    let minX = rect.left;
    let minY = rect.top;
    let maxX = rect.right;
    let maxY = rect.bottom;

    // Include related elements (dropdowns, popups) if they exist
    if (currentStep.includeRelatedSelector) {
      const relatedElement = document.querySelector(currentStep.includeRelatedSelector);
      if (relatedElement) {
        const relatedRect = relatedElement.getBoundingClientRect();
        minX = Math.min(minX, relatedRect.left);
        minY = Math.min(minY, relatedRect.top);
        maxX = Math.max(maxX, relatedRect.right);
        maxY = Math.max(maxY, relatedRect.bottom);
      }
    }
    
    const newSpotlight = {
      x: minX - basePadding - (extraPadding.left || 0),
      y: minY - basePadding - (extraPadding.top || 0),
      width: (maxX - minX) + basePadding * 2 + (extraPadding.left || 0) + (extraPadding.right || 0),
      height: (maxY - minY) + basePadding * 2 + (extraPadding.top || 0) + (extraPadding.bottom || 0),
    };
    
    setSpotlightRect(newSpotlight);
    
    const pos = calculateTooltipPosition(
      newSpotlight,
      currentStep.position,
      window.innerWidth,
      window.innerHeight,
      currentStep.tooltipCompact,
      currentStep.tooltipOffset
    );
    setTooltipPos(pos);
  }, [currentStep]);

  // Handle navigation for steps that require it
  useEffect(() => {
    if (!isActive || !currentStep?.navigateTo) return;
    
    const navMap: Record<string, string> = {
      'shops': '/app',
      'items': '/app/items',
      'map': '/app/map',
      'stats': '/app/stats',
      'players': '/app/players',
    };
    
    // Support direct paths starting with / or mapped keywords
    const path = currentStep.navigateTo.startsWith('/') 
      ? currentStep.navigateTo 
      : navMap[currentStep.navigateTo];
    if (path) {
      navigate(path);
    }
  }, [currentStepId, isActive, currentStep, navigate]);

  // Dynamic spotlight observation - watch for element size/position changes
  useEffect(() => {
    if (!isActive || !currentStep?.target || !currentStep.isInteractive) return;

    const element = document.querySelector(currentStep.target);
    if (!element) return;

    // Set up ResizeObserver for size changes
    observerRef.current = new ResizeObserver(() => {
      updateSpotlight();
    });
    observerRef.current.observe(element);

    // Set up MutationObserver for DOM changes (like dropdowns appearing)
    mutationObserverRef.current = new MutationObserver(() => {
      // Small delay to let animations complete
      setTimeout(updateSpotlight, 50);
    });
    mutationObserverRef.current.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style'],
    });

    // Also watch the parent for sibling changes (like dropdown panels)
    if (element.parentElement) {
      mutationObserverRef.current.observe(element.parentElement, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observerRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
    };
  }, [currentStepId, isActive, currentStep, updateSpotlight]);

  // Update spotlight when step changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    setShowContent(false);

    // Scroll element into view if needed
    if (currentStep.scrollToElement && currentStep.target) {
      const element = document.querySelector(currentStep.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const transitionTimer = setTimeout(() => {
      updateSpotlight();
      setShowContent(true);
    }, currentStep.scrollToElement ? 500 : 300); // Extra delay if scrolling

    return () => clearTimeout(transitionTimer);
  }, [currentStepId, isActive, currentStep, updateSpotlight]);

  // Handle auto-advance for reveal steps
  useEffect(() => {
    if (!isActive || !currentStep || !currentStep.autoAdvance) return;

    const delay = currentStep.autoAdvanceDelay || 2000;
    const timer = setTimeout(() => {
      handleNextStep();
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStepId, isActive, currentStep, handleNextStep]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateSpotlight]);

  // Set up click handlers for action steps
  useEffect(() => {
    if (!currentStep?.action || currentStep.action !== 'click' || !currentStep.actionTarget) return;

    const handleClick = (e: MouseEvent) => {
      const clickedElement = e.target as HTMLElement;
      
      // For shop-card, allow clicking ANY shop card
      if (currentStep.actionTarget === '[data-tutorial="shop-card"]') {
        const shopCard = clickedElement.closest('[data-tutorial="shop-card"]');
        if (shopCard) {
          handleNextStep();
          return;
        }
      }
      
      // For logo (finale step), end tutorial and navigate home
      if (currentStep.actionTarget === '[data-tutorial="logo"]') {
        const logo = clickedElement.closest('[data-tutorial="logo"]');
        if (logo) {
          handleExitTutorial();
          return;
        }
      }
      
      // For other targets, check if click is on the target or inside it
      const target = document.querySelector(currentStep.actionTarget!);
      if (target && (target === clickedElement || target.contains(clickedElement))) {
        handleNextStep();
      }
    };

    // Also handle form submits for submit buttons
    const handleSubmit = () => {
      // For save button, the form submit means success
      if (currentStep.actionTarget === '[data-tutorial="save-button"]' || 
          currentStep.actionTarget === '[data-tutorial="create-shop-btn"]') {
        handleNextStep();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick, true);
      document.addEventListener('submit', handleSubmit, true);
    }, 500);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [currentStep, handleNextStep]);

  // Block clicks on non-target elements for restrictClickToTarget steps
  useEffect(() => {
    if (!currentStep?.restrictClickToTarget || !currentStep.actionTarget) return;

    const blockNonTargetClicks = (e: MouseEvent) => {
      const clickedElement = e.target as HTMLElement;
      
      // Allow clicks on tutorial tooltip
      if (clickedElement.closest('[data-tutorial-tooltip]')) {
        return;
      }
      
      // Allow clicks on the target element
      if (clickedElement.closest(currentStep.actionTarget!)) {
        return;
      }
      
      // Block everything else
      e.stopPropagation();
      e.preventDefault();
    };

    // Use capture phase to intercept before the event reaches elements
    document.addEventListener('click', blockNonTargetClicks, true);
    document.addEventListener('mousedown', blockNonTargetClicks, true);

    return () => {
      document.removeEventListener('click', blockNonTargetClicks, true);
      document.removeEventListener('mousedown', blockNonTargetClicks, true);
    };
  }, [currentStep]);

  // Block navigation during blockNavigation steps (block navbar clicks)
  useEffect(() => {
    if (!currentStep?.blockNavigation) return;

    const blockNavClicks = (e: MouseEvent) => {
      const clickedElement = e.target as HTMLElement;
      
      // Allow clicks on tutorial tooltip
      if (clickedElement.closest('[data-tutorial-tooltip]')) {
        return;
      }
      
      // Block clicks on any nav items
      if (clickedElement.closest('[data-tutorial^="nav-"]') || 
          clickedElement.closest('[data-tutorial="bottom-nav"]') ||
          clickedElement.closest('[data-tutorial="logo"]')) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    document.addEventListener('click', blockNavClicks, true);
    document.addEventListener('mousedown', blockNavClicks, true);

    return () => {
      document.removeEventListener('click', blockNavClicks, true);
      document.removeEventListener('mousedown', blockNavClicks, true);
    };
  }, [currentStep]);

  // Update fixed spotlight rects for highlightMultipleFixed
  useEffect(() => {
    if (!currentStep?.highlightMultipleFixed) {
      setFixedSpotlightRects([]);
      return;
    }

    const updateFixedRects = () => {
      const rects: SpotlightRect[] = [];
      const basePadding = 8;
      
      currentStep.highlightMultipleFixed!.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          rects.push({
            x: rect.left - basePadding,
            y: rect.top - basePadding,
            width: rect.width + basePadding * 2,
            height: rect.height + basePadding * 2,
          });
        });
      });
      
      setFixedSpotlightRects(rects);
    };

    updateFixedRects();
    // Update on scroll since these are fixed position elements
    window.addEventListener('scroll', updateFixedRects, true);
    window.addEventListener('resize', updateFixedRects);

    return () => {
      window.removeEventListener('scroll', updateFixedRects, true);
      window.removeEventListener('resize', updateFixedRects);
    };
  }, [currentStep]);

  if (!isActive || !currentStep) return null;

  const handleChoiceClick = (action: 'continue' | 'skip' | 'end') => {
    if (action === 'end' || action === 'skip') {
      handleExitTutorial();
    } else {
      handleNextStep();
    }
  };

  const isCompact = currentStep.tooltipCompact === true;
  const isRevealStep = currentStep.isReveal === true;
  const isInteractiveStep = currentStep.isInteractive === true;
  // For exploration steps (interactive with no specific target), use corner position with compact style
  const isExplorationStep = isInteractiveStep && !currentStep.target;
  const useCompactStyle = isCompact || isExplorationStep;
  const isCentered = tooltipPos.placement === 'center' && !isExplorationStep;
  // For restrictClickToTarget, we need pointer-events but only allow target clicks
  const hasRestrictedClick = currentStep.restrictClickToTarget === true;
  // Allow click-through for: action clicks, reveal steps, interactive steps, or blockInteraction (allows expanding popup)
  // For restrictClickToTarget, we still want the overlay pointer-events-none so clicks reach the target
  const allowClickThrough = currentStep.action === 'click' || isRevealStep || isInteractiveStep || currentStep.blockInteraction;
  const stepIndex = TUTORIAL_STEPS.findIndex(s => s.id === currentStepId);
  const progress = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;

  // Calculate arrow/indicator position for pointing at spotlight
  const getIndicatorStyle = () => {
    if (!spotlightRect || isCentered) return null;
    
    const placement = tooltipPos.placement;
    const spotCenterX = spotlightRect.x + spotlightRect.width / 2;
    const spotCenterY = spotlightRect.y + spotlightRect.height / 2;
    
    switch (placement) {
      case 'top':
        return { left: spotCenterX, top: spotlightRect.y - 8, rotation: 180 };
      case 'bottom':
        return { left: spotCenterX, top: spotlightRect.y + spotlightRect.height + 8, rotation: 0 };
      case 'left':
        return { left: spotlightRect.x - 8, top: spotCenterY, rotation: 90 };
      case 'right':
        return { left: spotlightRect.x + spotlightRect.width + 8, top: spotCenterY, rotation: -90 };
      default:
        return null;
    }
  };

  const indicatorStyle = getIndicatorStyle();

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-[300] ${allowClickThrough ? 'pointer-events-none' : 'pointer-events-auto'}`}
      onMouseMove={() => setIsHoveringClose(false)}
    >
      {/* Dark overlay with spotlight cutout - hidden for exploration steps */}
      {!isExplorationStep && (
        <svg 
          className="absolute inset-0 w-full h-full transition-all duration-500 ease-out"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && !currentStep.highlightMultipleFixed && (
                <rect
                  x={spotlightRect.x}
                  y={spotlightRect.y}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx="12"
                  ry="12"
                  fill="black"
                  className="transition-all duration-500 ease-out"
                />
              )}
              {/* Fixed position spotlights that don't scroll */}
              {fixedSpotlightRects.map((rect, i) => (
                <rect
                  key={i}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx="8"
                  ry="8"
                  fill="black"
                  className="transition-all duration-300 ease-out"
                />
              ))}
            </mask>
          </defs>
          <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="100%" 
            fill={isRevealStep ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.80)"}
            mask={isRevealStep ? undefined : "url(#spotlight-mask)"}
            className="transition-all duration-500"
          />
        </svg>
      )}

      {/* Animated spotlight border with pulsing glow */}
      {spotlightRect && !isRevealStep && !isExplorationStep && !currentStep.highlightMultipleFixed && (
        <>
          <div
            className="absolute rounded-xl transition-all duration-500 ease-out pointer-events-none animate-pulse"
            style={{
              left: spotlightRect.x - 3,
              top: spotlightRect.y - 3,
              width: spotlightRect.width + 6,
              height: spotlightRect.height + 6,
              boxShadow: '0 0 0 2px rgba(241, 175, 21, 0.7), 0 0 40px 15px rgba(241, 175, 21, 0.2)',
            }}
          />
          {/* Inner highlight ring */}
          <div
            className="absolute rounded-xl transition-all duration-500 ease-out pointer-events-none"
            style={{
              left: spotlightRect.x,
              top: spotlightRect.y,
              width: spotlightRect.width,
              height: spotlightRect.height,
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          />
        </>
      )}

      {/* Fixed spotlight borders with pulsing glow */}
      {fixedSpotlightRects.map((rect, i) => (
        <div
          key={i}
          className="absolute rounded-lg transition-all duration-300 ease-out pointer-events-none animate-pulse"
          style={{
            left: rect.x - 2,
            top: rect.y - 2,
            width: rect.width + 4,
            height: rect.height + 4,
            boxShadow: '0 0 0 2px rgba(241, 175, 21, 0.7), 0 0 30px 10px rgba(241, 175, 21, 0.2)',
          }}
        />
      ))}

      {/* Dual indicators - dashed lines pointing to top and bottom save buttons */}
      {currentStep.showDualIndicators && fixedSpotlightRects.length >= 2 && showContent && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.8 }}
        >
          <defs>
            <marker id="arrowhead-up" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(241, 175, 21, 0.8)" />
            </marker>
            <marker id="arrowhead-down" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(241, 175, 21, 0.8)" />
            </marker>
          </defs>
          {/* Line to top button */}
          <line
            x1={window.innerWidth / 2}
            y1={window.innerHeight / 2 - 60}
            x2={fixedSpotlightRects[0].x + fixedSpotlightRects[0].width / 2}
            y2={fixedSpotlightRects[0].y + fixedSpotlightRects[0].height + 5}
            stroke="rgba(241, 175, 21, 0.6)"
            strokeWidth="2"
            strokeDasharray="8 4"
            markerEnd="url(#arrowhead-up)"
            className="animate-pulse"
          />
          {/* Line to bottom button */}
          <line
            x1={window.innerWidth / 2}
            y1={window.innerHeight / 2 + 60}
            x2={fixedSpotlightRects[1].x + fixedSpotlightRects[1].width / 2}
            y2={fixedSpotlightRects[1].y - 5}
            stroke="rgba(241, 175, 21, 0.6)"
            strokeWidth="2"
            strokeDasharray="8 4"
            markerEnd="url(#arrowhead-down)"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* Animated arrow indicator pointing at spotlight */}
      {indicatorStyle && currentStep.action === 'click' && (
        <div
          className="absolute pointer-events-none z-10 animate-bounce"
          style={{
            left: indicatorStyle.left,
            top: indicatorStyle.top,
            transform: `translate(-50%, -50%) rotate(${indicatorStyle.rotation}deg)`,
          }}
        >
          <div className="relative">
            <MousePointerClick className="w-8 h-8 text-cw-gold-400 drop-shadow-lg" />
          </div>
        </div>
      )}

      {/* Connecting line from tooltip to spotlight */}
      {spotlightRect && !isCentered && !isRevealStep && showContent && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500"
          style={{ opacity: showContent ? 0.4 : 0 }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(241, 175, 21, 0)" />
              <stop offset="50%" stopColor="rgba(241, 175, 21, 0.6)" />
              <stop offset="100%" stopColor="rgba(241, 175, 21, 0)" />
            </linearGradient>
          </defs>
          <line
            x1={tooltipPos.x + 190}
            y1={tooltipPos.y + 90}
            x2={spotlightRect.x + spotlightRect.width / 2}
            y2={spotlightRect.y + spotlightRect.height / 2}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            strokeDasharray="6 4"
            className="transition-all duration-500"
          />
        </svg>
      )}

      {/* Block clicks outside spotlight (not needed for restrictClickToTarget - handled by document listeners) */}
      {!allowClickThrough && !hasRestrictedClick && (
        <div 
          className="absolute inset-0"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('[data-tutorial-tooltip]')) {
              e.stopPropagation();
            }
          }}
        />
      )}

      {/* Tooltip */}
      <div
        data-tutorial-tooltip
        className={`absolute transition-all duration-500 ease-out pointer-events-auto ${
          showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          left: isCentered ? '50%' : tooltipPos.x,
          top: isCentered ? '50%' : tooltipPos.y,
          transform: isCentered ? 'translate(-50%, -50%)' : 'none',
          maxWidth: useCompactStyle ? '320px' : '400px',
          width: isCentered ? 'min(90%, 400px)' : useCompactStyle ? '300px' : '380px',
        }}
      >
        <div className={`bg-dark-400/95 backdrop-blur-xl border border-cw-gold-500/30 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden ${
          useCompactStyle ? 'border-cw-gold-500/50' : ''
        }`}>
          {/* Progress indicator */}
          {!useCompactStyle && (
            <div className="h-1 bg-dark-500">
              <div 
                className="h-full bg-gradient-to-r from-cw-gold-500 to-cw-gold-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className={useCompactStyle ? 'p-4' : 'p-5'}>
            {/* Compact/Exploration mode: streamlined content */}
            {useCompactStyle ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">{currentStep.title}</h3>
                  <span className="text-[10px] text-gray-500">{stepIndex + 1}/{TUTORIAL_STEPS.length}</span>
                </div>
                <p className="text-gray-300 text-sm mb-3 leading-relaxed">{currentStep.description}</p>
                {!currentStep.hideContinueButton && (
                  <button
                    onClick={handleNextStep}
                    className="w-full px-3 py-2 bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-1"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Step counter */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">
                    Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
                  </span>
                  {currentStep.action === 'click' && (
                    <span className="text-xs text-cw-gold-400 font-medium flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3" />
                      Click to continue
                    </span>
                  )}
                  {isInteractiveStep && (
                    <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3" />
                      Try it out!
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2">
                  {currentStep.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {currentStep.description}
                </p>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3">
                  {currentStep.isChoice ? (
                    currentStep.choiceOptions?.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleChoiceClick(option.action)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                          option.action === 'continue'
                            ? 'bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))
                  ) : currentStep.action !== 'click' ? (
                    <button
                      onClick={handleNextStep}
                      className="flex items-center gap-2 px-4 py-2 bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500 rounded-lg font-medium transition-all text-sm"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Close button - invisible until hovered in corner area */}
      <div
        className="absolute top-0 right-0 w-16 h-16 pointer-events-auto"
        onMouseEnter={() => setIsHoveringClose(true)}
        onMouseLeave={() => setIsHoveringClose(false)}
      >
        <button
          onClick={handleExitTutorial}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 ${
            isHoveringClose 
              ? 'opacity-100 bg-dark-400/90 border border-white/20 text-white scale-100' 
              : 'opacity-0 scale-75'
          }`}
          title="Exit tutorial (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
