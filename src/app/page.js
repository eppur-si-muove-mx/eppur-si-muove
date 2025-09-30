import Image from "next/image";
import styles from "./page.module.css";
import CameraDemo from "./CameraDemo";

export default function Home() {
  return (
    <div style={{ padding: 16 }}>
      <section style={{ padding: 16, width: '100%', boxSizing: 'border-box' }}>
        <h2>Sensor/Camera Demo</h2>
        <CameraDemo />
      </section>
    </div>
  );
}
