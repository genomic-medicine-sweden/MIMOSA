"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "primereact/button";

const AppWrapper = dynamic(() => import("@/components/AppWrapper"), {
  ssr: false,
});

export default function Page() {
  return (
    <>
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 1000 }}>
        <Link href="/login" passHref>
          <Button label="Login" className="p-button-sm p-button-primary" />
        </Link>
      </div>
      <AppWrapper />
    </>
  );
}
