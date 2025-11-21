"use client";

import React from "react";
import dynamic from "next/dynamic";

const MyCountyView = dynamic(() => import("./MyCountyView"), { ssr: false });

const CountyCard = ({ data }) => {
  return (
    <div className="h-full rounded-2xl shadow-md bg-white p-4 flex flex-col gap-4">
      <div className="flex-1 overflow-hidden">
        <MyCountyView data={data} />
      </div>
    </div>
  );
};

export default CountyCard;
