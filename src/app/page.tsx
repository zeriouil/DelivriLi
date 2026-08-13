import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the demo restaurant page for the purpose of this PWA prototype
  redirect('/taco-barn');
}
