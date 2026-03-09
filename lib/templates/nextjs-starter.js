/** @type {import('@webcontainer/api').FileSystemTree} */
export const starterTemplate = {
  'package.json': {
    file: {
      contents: JSON.stringify(
        {
          name: 'webweave-project',
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            next: '14.2.5',
            react: '18.3.1',
            'react-dom': '18.3.1',
            '@babel/runtime': '7.24.7',
            tailwindcss: '3.4.4',
            autoprefixer: '10.4.19',
            postcss: '8.4.38',
          },
        },
        null,
        2
      ),
    },
  },

  'babel.config.js': {
    file: {
      contents: `module.exports = {
  presets: [
    ['next/babel', {
      'preset-react': { runtime: 'automatic' },
      'transform-runtime': false,
    }],
  ],
};
`,
    },
  },

  'next.config.mjs': {
    file: {
      contents: `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`,
    },
  },

  'tailwind.config.js': {
    file: {
      contents: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`,
    },
  },

  'postcss.config.js': {
    file: {
      contents: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
    },
  },

  styles: {
    directory: {
      'globals.css': {
        file: {
          contents: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
        },
      },
    },
  },

  pages: {
    directory: {
      '_app.js': {
        file: {
          contents: `import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
`,
        },
      },
      'index.js': {
        file: {
          contents: `export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Hello from WebWeave!
        </h1>
        <p className="text-gray-600 text-lg">
          Your project is live. Start chatting with AI to build your site.
        </p>
      </div>
    </main>
  );
}
`,
        },
      },
    },
  },
};
