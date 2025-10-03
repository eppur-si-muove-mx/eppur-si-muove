"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Rotate3D, ScanEye } from "lucide-react";
import GyroAxisIndicator from "@/components/ar/GyroAxisIndicator";

export default function ARMotionOverlay({ enableMotion, debug, onEnableCamera, motionStatus, cameraActive }) {
    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between gap-2 p-4">

            {/* Gyroscope */}
            <div className="text-white font-semibold flex gap-4 flex-col items-start w-fit text-lg">
                <GyroAxisIndicator alpha={debug.alpha} beta={debug.beta} gamma={debug.gamma} size={24} />
                <div className="mt-2">α <span className="text-xs">{debug.alpha.toFixed(1)}°</span></div>
                <div>β <span className="text-xs">{debug.beta.toFixed(1)}°</span></div>
                <div>γ <span className="text-xs">{debug.gamma.toFixed(1)}°</span></div>
            </div>

            {/* Grant Access to sensors */}
            <div className="text-white font-semibold flex gap-4 h-fit items-center">
                <p className="text-white font-semibold">Sensors</p>
                <div className="flex gap-1 items-center text-white font-semibold justify-end">
                    <Button
                        onClick={enableMotion}
                        size="icon"
                        variant="outline"
                        className="bg-transparent"
                    >
                        <Rotate3D color={motionStatus === 'granted' ? 'green' : 'red'} />
                    </Button>
                </div>

                <div className="flex gap-1 items-center text-white font-semibold justify-end">
                    <Button
                        onClick={onEnableCamera}
                        size="icon"
                        variant="outline"
                        className="bg-transparent"
                    >
                        <ScanEye color={cameraActive ? 'green' : 'red'} />
                    </Button>
                </div>
            </div>

        </div>
    );
}


