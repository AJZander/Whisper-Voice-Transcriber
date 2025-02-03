// src/App.tsx
import { PrimeReactProvider } from 'primereact/api';
import Transcriber from "./pages/Transcriber";

function App() {
	return (
		<PrimeReactProvider>
				<Transcriber />
		</PrimeReactProvider>
    );
}

export default App;
