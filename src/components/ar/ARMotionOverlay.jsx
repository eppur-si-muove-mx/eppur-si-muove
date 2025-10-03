"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Rotate3D, ScanEye } from "lucide-react";
import GyroAxisIndicator from "@/components/ar/GyroAxisIndicator";

export default function ARMotionOverlay({ enableMotion, debug, onEnableCamera }) {
    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between gap-2 p-4">
            
            {/* Grant Access to sensors */}
            <div className="text-white font-semibold flex gap-4 h-fit items-center">
                Sensors
                <div className="flex gap-1 items-center text-white font-semibold justify-end">
                    <Button
                        onClick={enableMotion}
                        size="icon"
                        variant="ghost"
                    >
                        <Rotate3D />
                    </Button>
                </div>

                <div className="flex gap-1 items-center text-white font-semibold justify-end">
                    <Button
                        onClick={onEnableCamera}
                        size="icon"
                        variant="ghost"
                    >
                        <ScanEye />
                    </Button>
                </div>
            </div>

            {/* Gyroscope */}
            <div className="text-white font-semibold flex gap-4 flex-col items-end w-fit">
                <GyroAxisIndicator alpha={debug.alpha} beta={debug.beta} gamma={debug.gamma} size={24} />
                <div>α {debug.alpha.toFixed(1)}°</div>
                <div>β {debug.beta.toFixed(1)}°</div>
                <div>γ {debug.gamma.toFixed(1)}°</div>
            </div>

        </div>
    );
}


