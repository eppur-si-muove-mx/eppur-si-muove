"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export default function ARMotionOverlay({ enableMotion, debug, onEnableCamera }) {
    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex flex-col gap-1">
            <Button
                onClick={enableMotion}
                size="sm"
            >
                Enable Motion
            </Button>

            {/* Gyroscope */}
            <div className="text-white font-mono text-sm rounded-md pointer-events-none flex gap-4">
                <div>α {debug.alpha.toFixed(1)}°</div>
                <div>β {debug.beta.toFixed(1)}°</div>
                <div>γ {debug.gamma.toFixed(1)}°</div>
            </div>

            {onEnableCamera && (
                <div className="fixed bottom-5 left-0 right-0 z-[3] flex justify-center pointer-events-none">
                    <div className="flex gap-3 pointer-events-auto">
                        <Button
                            onClick={onEnableCamera}
                            size="sm"
                            className="opacity-60 backdrop-blur-md"
                        >
                            Enable Camera
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}


