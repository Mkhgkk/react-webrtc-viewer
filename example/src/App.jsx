import WhepPlayer from "react-webrtc-viewer";
import "./App.css";

function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <WhepPlayer
        url="http://localhost/live/stream1/whep"
        enableZoomPan={false}
        maxZoom={5}
        onReady={() => console.log("Player ready")}
        onError={(error) => console.error("Error:", error)}
        style={{ width: "100%", height: "100%", border: "1px solid red" }}
        options={{ autoPlay: true, muted: true }}
      />
    </div>
  );
}

export default App;
