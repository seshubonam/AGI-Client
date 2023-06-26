import React from 'react';
import * as ReactDOM from 'react-dom/client';

import { startWeb3 } from './util/web3';

import settings from './client/state/settings';
import { getPWADisplayMode } from "./util/PWA.js"

import App from './app/pages/App';

function startApp() {

    getPWADisplayMode();
    settings.applyTheme();
    startWeb3();

    const root = ReactDOM.createRoot(document.getElementById('root'));
    return root.render(<App />);

}

export default startApp;
