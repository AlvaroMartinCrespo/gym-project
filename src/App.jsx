import Layout from "./components/layout/Layout"
import toast, { Toaster } from 'react-hot-toast';

function App() {

  return (
    <>
        <Layout title="Mi pagina" toast={toast}/>
        <Toaster position="top-right"/>
    </>
  )
}

export default App
