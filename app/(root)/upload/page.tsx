"use client";
import MushroomForm from "@/components/upload/MushroomForm";
import React, { useState, useRef, useEffect } from "react";

export default function UploadPage() {

  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLUListElement | null>(null);
  const [height, setHeight] = useState("0px");
  
  useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [open]);

  return (
    <div>
     <div className="mb-6">
        <div className="bg-gray-100 border-l-4 border-blue-500 rounded overflow-hidden">
          {/* Accordion Button */}
          <button
            onClick={() => setOpen(!open)}
            className="w-full text-left font-semibold px-4 py-2 cursor-pointer flex items-center"
          >
            Dataset Requirements
            <span
              className={`ml-2 inline-block transform transition-transform duration-300 ${
                open ? "rotate-90" : ""
              }`}
            >
              &#9654;
            </span>
          </button>

          {/* Divider line */}
          <div className="h-px bg-gray-300 mx-4"></div>

          {/* Collapsible Content */}
          <div
            ref={contentRef}
            style={{ maxHeight: height }}
            className="overflow-hidden transition-all duration-500 ease-in-out px-4"
          >
            <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1 py-2">
              <li>First column must be labelled <strong>Time</strong>.</li>
              <li>Second column must be named <strong>Signal_MV</strong>.</li>
              <li>Only one differential signal column is allowed.</li>
              <li>File format must be CSV.</li>
              <li>Dataset must be complete and contain no empty rows or missing values.</li>
            </ul>
            {/* Warning text under the list */}
            <div className="text-sm text-red-600 mt-2">
              Failure to adhere to formatting requirements will result in failure of dataset upload.
            </div>
          </div>
        </div>
      </div>

    <MushroomForm />
  </div>
  );
}
