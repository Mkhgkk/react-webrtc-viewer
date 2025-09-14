import WhepPlayer from "react-webrtc-viewer";
import "./App.css";

function App() {
  return (
    <WhepPlayer
      url="http://example.com/live/stream/whep"
      enableZoomPan={true}
      maxZoom={5}
      onReady={() => console.log("Player ready")}
      onError={(error) => console.error("Error:", error)}
      style={{ width: "100%", height: "100%" }}
      options={{}}
      objectFit="fill"
    />
  );
}

export default App;
