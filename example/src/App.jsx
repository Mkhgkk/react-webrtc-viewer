import WhepPlayer from "react-webrtc-viewer";

function App() {
  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <WhepPlayer
        url="http://localhost/live/stream1/whep"
        enableZoomPan={false}
        maxZoom={5}
        onReady={() => console.log("Player ready")}
        onError={(error) => console.error("Error:", error)}
        style={{ width: "100%", height: "100%" }}
        options={{ autoPlay: true, muted: true }}
      />
    </div>
  );
}

export default App;
