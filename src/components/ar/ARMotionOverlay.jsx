"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Rotate3D, ScanEye } from "lucide-react";
import GyroAxisIndicator from "@/components/ar/GyroAxisIndicator";
import { toast } from "sonner";

export default function ARMotionOverlay({ enableMotion, debug, onEnableCamera, motionStatus, cameraActive, onSearchNewHome }) {

    // const rotate3DColor = useMemo(() => {
    //     return motionStatus !== 'idle' ? 'text-blue-200' : 'text-blue-50'
    // }, [motionStatus])

    // const scanEyeColor = useMemo(() => {
    //     return cameraActive ? 'text-blue-200' : 'text-blue-50'
    // }, [cameraActive])

    const motionGranted = (motionStatus === 'active') || Number.isFinite(debug?.alpha) || Number.isFinite(debug?.beta) || Number.isFinite(debug?.gamma)

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex flex-col justify-between h-full z-10">
            <div className=" z-10 flex justify-start  gap-2 p-4">
                {/* Gyroscope */}
                <div className="text-blue-200 font-semibold flex gap-4 flex-col items-start w-fit text-sm font-thin">
                    <GyroAxisIndicator alpha={debug.alpha} beta={debug.beta} gamma={debug.gamma} size={24} />
                    <div className="mt-2"><span className="text-sm">α {debug.alpha.toFixed(1)}°</span></div>
                    <div><span className="text-sm">β {debug.beta.toFixed(1)}°</span></div>
                    <div><span className="text-sm">γ {debug.gamma.toFixed(1)}°</span></div>
                </div>
                {/*Sidebar trigger*/}
            </div>

            <div className="p-4 flex flex-col items-end justify-end w-full gap-10">
                {/* Grant Access to sensors */}
                <div className="text-blue-200 font-semibold flex flex-col gap-4 h-fit items-start font-thin text-xs">
                    <div className="flex gap-4 items-center text-blue-200 font-semibold justify-end">
                        <p>
                            <span className={`${motionGranted ? 'text-green-300' : 'text-blue-200/40'}`}>on</span>
                            /
                            <span className={`${motionGranted ? 'text-blue-200/40' : 'text-blue-200'}`}>off</span>
                        </p>
                        <Button
                            onClick={enableMotion}
                            size="icon"
                            variant="outline"
                            className="bg-transparent border-blue-200"
                        >
                            <Rotate3D className="size-6" />
                        </Button>
                    </div>

                    <div className="flex gap-4 items-center text-blue-200 font-semibold justify-end">
                        <p>
                            <span className={`${cameraActive ? 'text-green-300' : 'text-blue-200/40'}`}>on</span>
                            /
                            <span className={`${cameraActive ? 'text-blue-200/40' : 'text-blue-200'}`}>off</span>
                        </p>
                        <Button
                            onClick={onEnableCamera}
                            size="icon"
                            variant="outline"
                            className="bg-transparent border-blue-200"
                        >
                            <ScanEye className="size-6" />
                        </Button>
                    </div>
                </div>

                <Button className="bg-blue-200 text-blue-900 opacity-80" onClick={onSearchNewHome}>
                    Search a new home
                </Button>
            </div>
        </div>
    );
}


