import Image from "next/image";
import styles from "./page.module.css";
import CameraDemo from "./CameraDemo";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{ padding: 16 }}>
      <section style={{ padding: 16, width: '100%', boxSizing: 'border-box' }}>
        <h2>Sensor/Camera Demo</h2>
        <CameraDemo />
      </section>
      <section style={{ padding: 16 }}>
        <Link href="/ar-experience" className="rounded-md border px-3 py-2 inline-block">
          Go to AR Experience →
        </Link>
      </section>
    </div>
  );
}
