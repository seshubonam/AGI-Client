/* eslint-disable import/prefer-default-export */
import React, { lazy, Suspense } from 'react';

import * as linkify from "linkifyjs";
import linkifyHtml from 'linkify-html';
import Linkify from 'linkify-react';

import linkifyRegisterKeywords from 'linkify-plugin-keyword';

import parse from 'html-react-parser';
import twemoji from 'twemoji';
import Tooltip from '../app/atoms/tooltip/Tooltip';
import { sanitizeText } from './sanitize';

import keywords from '../../mods/keywords';
import { btModal } from './tools';

// Register Protocols
linkify.registerCustomProtocol('matrix');
linkify.registerCustomProtocol('twitter');
linkify.registerCustomProtocol('steam');

linkify.registerCustomProtocol('ircs');
linkify.registerCustomProtocol('irc');

linkify.registerCustomProtocol('ftp');

linkify.registerCustomProtocol('ipfs');

linkify.registerCustomProtocol('bitcoin');
linkify.registerCustomProtocol('dogecoin');
linkify.registerCustomProtocol('monero');

linkify.registerCustomProtocol('ethereum');
linkify.registerCustomProtocol('web3');

linkify.registerCustomProtocol('ar');
linkify.registerCustomProtocol('lbry');

// Register Keywords
const tinywords = [];
const tinywordsDB = {};
for (const item in keywords) {

  if (typeof keywords[item].name === 'string') {
    tinywords.push(keywords[item].name);
    tinywordsDB[keywords[item].name] = { href: keywords[item].href, title: keywords[item].title };
  }

  else if (Array.isArray(keywords[item].name) && keywords[item].name.length > 0) {
    for (const item2 in keywords[item].name) {
      if (typeof keywords[item].name[item2] === 'string') {
        tinywords.push(keywords[item].name[item2]);
        tinywordsDB[keywords[item].name[item2]] = { href: keywords[item].href, title: keywords[item].title };
      };
    }
  }

}

linkifyRegisterKeywords(tinywords);

// Emoji Base
export const TWEMOJI_BASE_URL = './img/twemoji/';

// String Protocols
global.String.prototype.toUnicode = function () {
  let result = "";
  for (let i = 0; i < this.length; i++) {
    // Assumption: all characters are < 0xffff
    result += `\\u${(`000${this[i].charCodeAt(0).toString(16)}`).substring(-4)}`;
  }
  return result;
};

global.String.prototype.emojiToCode = function () {
  return this.codePointAt(0).toString(16);
};

// Tiny Math
const Math = lazy(() => import('../app/atoms/math/Math'));
const mathOptions = {
  replace: (node) => {
    const maths = node.attribs?.['data-mx-maths'];
    if (maths) {
      return (
        <Suspense fallback={<code>{maths}</code>}>
          <Math
            content={maths}
            throwOnError={false}
            errorColor="var(--tc-danger-normal)"
            displayMode={node.name === 'div'}
          />
        </Suspense>
      );
    }
    return null;
  },
};

// Open URL
const openTinyURL = (url) => {
  try {

    // Prepare Whitelist
    const whiteList = JSON.parse(localStorage.getItem('pony-house-urls-whitelist') ?? '[]');
    let urlAllowed = false;

    // Read Whitelist
    const tinyUrl = new URL(url);
    if (whiteList.indexOf(tinyUrl.origin) > -1) urlAllowed = true;
    if (!urlAllowed) {

      const tinyModal = btModal({

        id: 'trust-tiny-url',
        title: `Leaving ${__ENV_APP__.info.name}`,

        dialog: 'modal-dialog-centered modal-lg',

        body: $('<center>', { class: 'small' }).append(

          $('<p>').text('This link is taking you to the following website'),

          $('<div>', { class: 'card' }).append(
            $('<div>', { class: 'card-body text-break' }).text(url)
          ),

          $('<div>', { class: 'form-check mt-2 text-start' }).append(
            $('<input>', { type: 'checkbox', class: 'form-check-input', id: 'whitelist-the-domain' }),
            $('<label>', { class: 'form-check-label small', for: 'whitelist-the-domain' }).html(`Trust <strong>${tinyUrl.hostname}</strong> links from now on`)
          )

        ),

        footer: [
          $('<button>', { class: 'btn btn-bg mx-2' }).text('Go Back').on('click', () => tinyModal.hide()),
          $('<button>', { class: 'btn btn-primary mx-2' }).text('Visit Site').on('click', () => {

            if ($('#whitelist-the-domain').is(':checked')) {
              whiteList.push(tinyUrl.origin);
              global.localStorage.setItem('pony-house-urls-whitelist', JSON.stringify(whiteList));
            }

            global.open(url, '_blank');
            tinyModal.hide();

          }),
        ],

      });

    } else if (urlAllowed) global.open(url, '_blank');

  } catch (err) {
    alert(err.message, 'Error - Open External url');
    console.error(err);
  }
};

const tinyRender = {

  html: type => ({ attributes, content }) => {

    let tinyAttr = '';
    for (const attr in attributes) {
      tinyAttr += ` ${attr}${attributes[attr].length > 0 ? `=${attributes[attr]}` : ''}`;
    }

    if (type === 'keyword') {
      tinyAttr += ' iskeyword="true"';
    } else {
      tinyAttr += ' iskeyword="false"';
    }

    const db = tinywordsDB[content.toLowerCase()];
    return `<a${tinyAttr} title="${db?.title}">${content}</a>`;

  },

  react: type => ({ attributes, content }) => {
    const { href, ...props } = attributes;
    const db = tinywordsDB[content.toLowerCase()];
    return <Tooltip content={<small>{db?.title}</small>} >
      <a href={href} onClick={(e) => { e.preventDefault(); openTinyURL($(e.target).attr('href')); return false; }} {...props} iskeyword={type === 'keyword' ? 'true' : 'false'} className='lk-href'>{content}</a>
    </Tooltip>;
  }

};

tinyRender.list = {

  react: {
    url: tinyRender.react('url'),
    mail: tinyRender.react('mail'),
    email: tinyRender.react('email'),
    keyword: tinyRender.react('keyword'),
  },

  html: {
    url: tinyRender.html('url'),
    mail: tinyRender.html('mail'),
    email: tinyRender.html('email'),
    keyword: tinyRender.html('keyword'),
  }

};

/**
 * @param {string} text - text to twemojify
 * @param {object|undefined} opts - options for tweomoji.parse
 * @param {boolean} [linkify=false] - convert links to html tags (default: false)
 * @param {boolean} [sanitize=true] - sanitize html text (default: true)
 * @param {boolean} [maths=false] - render maths (default: false)
 * @returns React component
 */
const twemojifyAction = (text, opts, linkifyEnabled, sanitize, maths, isReact) => {

  // Not String
  if (typeof text !== 'string') return text;

  // Content Prepare
  let msgContent = text;
  const options = opts ?? { base: TWEMOJI_BASE_URL };
  if (!options.base) {
    options.base = TWEMOJI_BASE_URL;
  }

  // Sanitize Filter
  if (sanitize) {
    msgContent = sanitizeText(msgContent);
  }

  // Emoji Parse
  msgContent = twemoji.parse(msgContent, options);

  // Linkify Options
  const linkifyOptions = {

    defaultProtocol: 'https',

    formatHref: {
      keyword: (keyword) => {
        const tinyword = keyword.toLowerCase();
        if (tinywordsDB[tinyword] && typeof tinywordsDB[tinyword].href === 'string') return tinywordsDB[tinyword].href;
      },
    },

    rel: 'noreferrer noopener',
    target: '_blank',

  };

  // React Mode
  if (isReact) {

    // Insert Linkify
    if (linkifyEnabled) {

      // Render Data
      linkifyOptions.render = tinyRender.list.react;
      return <span className='linkify-base'><Linkify options={linkifyOptions}>{parse(msgContent, maths ? mathOptions : null)}</Linkify></span>;

    }

    // Complete
    return <span className='linkify-base'>{parse(msgContent, maths ? mathOptions : null)}</span>;

  }

  // jQuery Mode

  // Insert Linkify
  if (linkifyEnabled) {

    // Render Data
    linkifyOptions.render = tinyRender.list.html;
    linkifyOptions.className = 'lk-href';

    // Insert Render
    msgContent = linkifyHtml(msgContent, linkifyOptions);

  }

  // Final Result
  msgContent = $('<span>', { class: 'linkify-base' }).html(msgContent);
  msgContent.find('.lk-href').on('click', event => { const e = event.originalEvent; e.preventDefault(); openTinyURL($(e.target).attr('href')); return false; }).tooltip();

  // Complete
  return msgContent;

};

// Functions
export function twemojify(text, opts, linkifyEnabled = false, sanitize = true) {
  return twemojifyAction(text, opts, linkifyEnabled, sanitize, false, false);
}

export function twemojifyReact(text, opts, linkifyEnabled = false, sanitize = true, maths = false) {
  return twemojifyAction(text, opts, linkifyEnabled, sanitize, maths, true);
};

export function twemojifyIcon(text, size = 72) {
  return `${TWEMOJI_BASE_URL}${size}x${size}/${text.emojiToCode().toLowerCase()}.png`;
}
