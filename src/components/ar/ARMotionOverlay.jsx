"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Rotate3D, ScanEye } from "lucide-react";

export default function ARMotionOverlay({ enableMotion, debug, onEnableCamera }) {
    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex flex-col gap-2 p-4 align-end justify-start">

            {/* Gyroscope */}
            <div className="text-white font-mono text-sm rounded-md pointer-events-none flex gap-4 ml-auto">
                <div>α {debug.alpha.toFixed(1)}°</div>
                <div>β {debug.beta.toFixed(1)}°</div>
                <div>γ {debug.gamma.toFixed(1)}°</div>
            </div>

            {/* Grant Access to sensors */}
            <div className="flex items-center align-center gap-2 w-fit ml-auto text-white font-semibold">
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
        </div>
    );
}


