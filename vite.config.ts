import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      sourcemap: false,
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'vendor-react';
              if (id.includes('motion')) return 'vendor-motion';
              return 'vendor-core';
            }
            if (id.includes('src/version.ts')) return 'app-version';
            if (id.includes('src/components/SchematicTopologyView')) return 'view-schematic';
            if (id.includes('src/components/CiscoTerminalModal') || id.includes('src/components/MikroTikTerminalModal')) return 'modal-terminals';
            if (id.includes('src/components/AddDeviceModal') || id.includes('src/components/EditDeviceModal') || id.includes('src/components/PortInspectorModal')) return 'modal-device-mgmt';
            if (id.includes('src/components/TopologyDiscoveryModal') || id.includes('src/components/CaptureConfigModal')) return 'modal-discovery';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
