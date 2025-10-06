"use client";

import React from "react";

export default function GyroAxisIndicator({ alpha = 0, beta = 0, gamma = 0, size = 36 }) {
    const px = typeof size === "number" ? `${size}px` : size;

    return (
        <div
            className="relative pointer-events-none"
            style={{ width: `36px`, height: `36px`, perspective: "120px" }}
        >
            {/* Alpha (Z axis) */}
            <div
                className="absolute inset-0 rounded-full border border-white text-red-400"
                style={{
                    transformOrigin: "50% 50%",
                    transform: `rotateY(${(alpha+90)}deg)`
                    // transform: `rotateY(45deg)`
                }}
            >
            </div>

            {/* Beta (X axis) */}
            <div
                className="absolute inset-0 rounded-full border border-white text-green-400"
                style={{
                    transformOrigin: "50% 50%",
                    transform: `rotateX(${(beta)}deg)`
                    // transform: `rotateX(0deg)`
                }}
            >
            </div>

            {/* Gamma (Y axis) */}
            <div
                className="absolute inset-0 rounded-full border border-white text-blue-400"
                style={{
                    transformOrigin: "50% 50%",
                    transform: `rotate(${gamma}deg)`
                    // transform: `rotate(0deg)`
                }}
            >
            </div>
        </div>
    );
}


