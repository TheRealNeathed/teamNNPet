// src/app/layout.js
import './globals.css';    // <- add this line at the very top

export const metadata = {
  title: 'Couples To-Do & Pet',
  description: 'A shared checklist and virtual pet',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
