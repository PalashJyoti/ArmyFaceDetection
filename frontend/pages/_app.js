import "@/styles/globals.css";
import { Libre_Franklin } from 'next/font/google';

const libre = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400','700'],
})


export default function App({ Component, pageProps }) {
  return (
    <main className={libre.className}>
      <Component {...pageProps} />
    </main>
  );
}