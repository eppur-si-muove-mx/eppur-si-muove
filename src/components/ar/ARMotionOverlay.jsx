"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Rotate3D, ScanEye } from "lucide-react";
import GyroAxisIndicator from "@/components/ar/GyroAxisIndicator";

export default function ARMotionOverlay({ enableMotion, debug, onEnableCamera, motionStatus, cameraActive }) {
    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between gap-2 p-4">

            {/* Gyroscope */}
            <div className="text-blue-200 font-semibold flex gap-4 flex-col items-start w-fit text-sm">
                <GyroAxisIndicator alpha={debug.alpha} beta={debug.beta} gamma={debug.gamma} size={24} />
                <div className="mt-2">α <span className="text-sm">{debug.alpha.toFixed(1)}°</span></div>
                <div>β <span className="text-sm">{debug.beta.toFixed(1)}°</span></div>
                <div>γ <span className="text-sm">{debug.gamma.toFixed(1)}°</span></div>
            </div>

            {/* Grant Access to sensors */}
            <div className="text-blue-200 font-semibold flex gap-4 h-fit items-center">
                <p className="text-blue-200 font-semibold">Sensors</p>
                <div className="flex gap-1 items-center text-blue-200 font-semibold justify-end">
                    <Button
                        onClick={enableMotion}
                        size="icon"
                        variant="ghost"
                        className="bg-transparent"
                    >
                        <Rotate3D style={{ color: motionStatus === 'granted' ? 'blue-200' : 'blue-700' }} className="size-6" />
                    </Button>
                </div>

                <div className="flex gap-1 items-center text-blue-200 font-semibold justify-end">
                    <Button
                        onClick={onEnableCamera}
                        size="icon"
                        variant="ghost"
                        className="bg-transparent"
                    >
                        <ScanEye style={{ color: cameraActive ? 'blue-200' : 'blue-700' }} className="size-6" />
                    </Button>
                </div>
            </div>

        </div>
    );
}


