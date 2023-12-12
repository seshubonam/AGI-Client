import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import TextareaAutosize from 'react-autosize-textarea';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import { openEmojiBoard } from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';
import { bytesToSize, getEventCords } from '../../../util/common';
import { getUsername, getCurrentState } from '../../../util/matrixUtil';
import { colorMXID } from '../../../util/colorMXID';
import { shiftNuller } from '../../../util/shortcut';
import audioRecorder from '../../../util/audioRec';
import { momentCountdown, resizeWindowChecker, toast } from '../../../util/tools';
import moment from '../../../util/libs/momentjs';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import ScrollView from '../../atoms/scroll/ScrollView';
import { MessageReply } from '../../molecules/message/Message';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import commands from '../../../commands';

// Variables
const CMD_REGEX = /(^\/|:|@)(\S*)$/;
let isTyping = false;
let isCmdActivated = false;
let cmdCursorPos = null;

// Room View Input
function RoomViewInput({
  roomId, roomTimeline, viewEvent, refRoomInput,
}) {

  // Rec Ref
  const recAudioRef = useRef(null);

  // File
  const [attachment, setAttachment] = useState(null);

  // Reply
  const [replyTo, setReplyTo] = useState(null);

  // Inputs
  const textAreaRef = useRef(null);
  const inputBaseRef = useRef(null);
  const uploadInputRef = useRef(null);
  const uploadProgressRef = useRef(null);
  const rightOptionsRef = useRef(null);

  // Timeout Cfg
  const TYPING_TIMEOUT = 5000;

  // Matrix Client
  const mx = initMatrix.matrixClient;
  const { roomsInput } = initMatrix;

  // Request Focus
  function requestFocusInput() {
    $(textAreaRef.current).focus();
  }

  // Send is Typing
  const sendIsTyping = (isT) => {
    mx.sendTyping(roomId, isT, isT ? TYPING_TIMEOUT : undefined);
    isTyping = isT;

    if (isT === true) {
      setTimeout(() => {
        if (isTyping) sendIsTyping(false);
      }, TYPING_TIMEOUT);
    }
  };

  function checkTypingPerm() {
    const content = mx.getAccountData('pony.house.privacy')?.getContent() ?? {};
    return (content.hideTypingWarn === true);
  };

  // Effects
  useEffect(() => {

    // Audio Record
    const prefixConsole = (text, type = 'log') => console[type](`[chatbox record] ${text}`);
    const tinyRec = { enabled: false, loading: false, timeout: 0, timeout2: 0, clock: moment().subtract(1, 'second'), pointRec: '' };
    tinyRec.input = $(recAudioRef.current);
    tinyRec.time = tinyRec.input.find('> time');
    tinyRec.roomInput = $('.room-input');
    const holdTinyAudio = [

      // User Click
      () => {

        tinyRec.clock = moment().subtract(1, 'second');
        tinyRec.roomInput.removeClass('textarea-focus-rec');
        tinyRec.time.addClass('d-none').text('');
        tinyRec.input.addClass('audio-click');

        clearInterval(tinyRec.timeout2); tinyRec.timeout2 = 0;
        clearTimeout(tinyRec.timeout);

        if (tinyRec.enabled || tinyRec.loading) {
          if (!checkTypingPerm()) sendIsTyping(false);
          audioRecorder.cancel();
          tinyRec.enabled = false;
        }

        tinyRec.loading = true;
        tinyRec.timeout = setTimeout(holdTinyAudio[2], 300);

      },

      // Remove Click
      () => {

        // Stop Interval
        clearInterval(tinyRec.timeout2); tinyRec.timeout2 = 0;
        clearTimeout(tinyRec.timeout);

        // Audio Click
        tinyRec.roomInput.removeClass('textarea-focus-rec');
        tinyRec.time.addClass('d-none').text('');
        tinyRec.input.removeClass('audio-hold').removeClass('audio-click');
        $(textAreaRef.current).attr('placeholder', 'Send a message...');

        // Stop Record
        if (!tinyRec.loading) {
          if (!checkTypingPerm()) sendIsTyping(false);
          audioRecorder.stop().then(blob => {
            if (blob) {

              // Get Room ID
              const selectedRoomId = navigation.selectedRoomId;
              if (!selectedRoomId) return;

              // Get Type
              let fileExt = blob.type;

              // Filter File Type
              if (typeof fileExt === 'string') {
                fileExt = fileExt.split('/');
                fileExt = fileExt[1].split(';')[0];
              }

              // Insert File Name
              blob.name = `voice_message_${moment().format('MM/DD/YYYY_HH:mm:ss')}.${fileExt}`;

              // Insert attachment and complete
              initMatrix.roomsInput.setAttachment(selectedRoomId, blob);
              initMatrix.roomsInput.emit(cons.events.roomsInput.ATTACHMENT_SET, blob);
              tinyRec.enabled = false;

            }
          })

            // Fail Record
            .catch(err => {

              // on error
              // No Browser Support Error
              if (err.message.includes('mediaDevices API or getUserMedia method is not supported in this browser.')) {
                prefixConsole('To record audio, use browsers like Chrome and Firefox.', 'warn');
              }

              // Error handling structure
              switch (err.name) {
                case 'AbortError': // err from navigator.mediaDevices.getUserMedia
                  prefixConsole('An AbortError has occured.', 'error');
                  console.error(err);
                  break;
                case 'NotAllowedError': // err from navigator.mediaDevices.getUserMedia
                  prefixConsole('A NotAllowedError has occured. User might have denied permission.', 'error');
                  console.error(err);
                  break;
                case 'NotFoundError': // err from navigator.mediaDevices.getUserMedia
                  prefixConsole('A NotFoundError has occured.', 'error');
                  console.error(err);
                  break;
                case 'NotReadableError': // err from navigator.mediaDevices.getUserMedia
                  prefixConsole('A NotReadableError has occured.', 'error');
                  console.error(err);
                  break;
                case 'SecurityError': // err from navigator.mediaDevices.getUserMedia or from the MediaRecorder.start
                  prefixConsole('A SecurityError has occured.', 'error');
                  console.error(err);
                  break;
                case 'TypeError': // err from navigator.mediaDevices.getUserMedia
                  prefixConsole('A TypeError has occured.', 'error');
                  console.error(err);
                  break;
                case 'InvalidStateError': // err from the MediaRecorder.start
                  prefixConsole('An InvalidStateError has occured.', 'error');
                  console.error(err);
                  break;
                case 'UnknownError': // err from the MediaRecorder.start
                  prefixConsole('An UnknownError has occured.', 'error');
                  console.error(err);
                  break;
                default:
                  prefixConsole(`An err occured with the err name ${err.name}`, 'error');
                  console.error(err);
              };

              tinyRec.enabled = false;
              tinyRec.loading = false;
              toast(err.message);

            });
        }

        // Cancel
        else {

          // Complete
          if (!checkTypingPerm()) sendIsTyping(false);
          audioRecorder.cancel();

          tinyRec.enabled = false;
          tinyRec.loading = false;

        }

      },

      // User Hold
      () => {
        if (tinyRec.loading && !tinyRec.enabled && !tinyRec.timeout2) {

          tinyRec.enabled = true;

          tinyRec.timeout2 = momentCountdown((time) => {

            if (tinyRec.pointRec === '...') {
              tinyRec.pointRec = '';
            } else if (tinyRec.pointRec === '..') {
              tinyRec.pointRec = '...';
            } else if (tinyRec.pointRec === '.') {
              tinyRec.pointRec = '..';
            } else {
              tinyRec.pointRec = '.';
            }

            tinyRec.input.addClass('audio-hold');

            tinyRec.time.text(time);
            $(textAreaRef.current).attr('placeholder', `${time} - Recording voice${tinyRec.pointRec}`);

          }, tinyRec.clock);

          // Start Record
          if (!checkTypingPerm()) sendIsTyping(true);
          audioRecorder.start().then(() => {
            tinyRec.loading = false;
            tinyRec.roomInput.addClass('textarea-focus-rec');
            tinyRec.time.removeClass('d-none');
          })

            // Fail Record
            .catch(err => {

              // No Browser Support Error
              if (err.message.includes('mediaDevices API or getUserMedia method is not supported in this browser.')) {
                prefixConsole('To record audio, use browsers like Chrome and Firefox.', 'warn');
              }

              // Error handling structure
              switch (err.name) {
                case 'AbortError': // error from navigator.mediaDevices.getUserMedia
                  prefixConsole('An AbortError has occured.', 'error');
                  console.error(err);
                  break;
                case 'NotAllowedError': // error from navigator.mediaDevices.getUserMedia
                  prefixConsole('A NotAllowedError has occured. User might have denied permission.', 'error');
                  console.error(err);
                  break;
                case 'NotFoundError': // error from navigator.mediaDevices.getUserMedia
                  prefixConsole('A NotFoundError has occured.', 'error');
                  console.error(err);
                  break;
                case 'NotReadableError': // error from navigator.mediaDevices.getUserMedia
                  prefixConsole('A NotReadableError has occured.', 'error');
                  console.error(err);
                  break;
                case 'SecurityError': // error from navigator.mediaDevices.getUserMedia or from the MediaRecorder.start
                  prefixConsole('A SecurityError has occured.', 'error');
                  console.error(err);
                  break;
                case 'TypeError': // error from navigator.mediaDevices.getUserMedia
                  prefixConsole('A TypeError has occured.', 'error');
                  console.error(err);
                  break;
                case 'InvalidStateError': // error from the MediaRecorder.start
                  prefixConsole('An InvalidStateError has occured.', 'error');
                  console.error(err);
                  break;
                case 'UnknownError': // error from the MediaRecorder.start
                  prefixConsole('An UnknownError has occured.', 'error');
                  console.error(err);
                  break;
                default:
                  prefixConsole(`An error occured with the error name ${err.name}`, 'error');
                  console.error(err);
              };

              tinyRec.enabled = false;
              tinyRec.loading = false;
              toast(err.message);

            });

        }
      },
      () => {

        // Warn Hold
        if (!tinyRec.enabled) {
          toast(`You need to hold the button down to record your audio.`, 'Send Voice - Warning');
        }

      }
    ];

    // Events
    roomsInput.on(cons.events.roomsInput.ATTACHMENT_SET, setAttachment);
    viewEvent.on('focus_msg_input', requestFocusInput);
    tinyRec.input.on('mousedown touchstart', holdTinyAudio[0]).on('mouseup mouseleave touchend', holdTinyAudio[1]).on('click', holdTinyAudio[3]);

    return () => {
      tinyRec.input.off('mousedown', holdTinyAudio[0]).off('mouseup mouseleave', holdTinyAudio[1]).off('click', holdTinyAudio[3]);
      roomsInput.removeListener(cons.events.roomsInput.ATTACHMENT_SET, setAttachment);
      viewEvent.removeListener('focus_msg_input', requestFocusInput);
    };

  }, []);

  function uploadingProgress(myRoomId, { loaded, total }) {

    if (myRoomId !== roomId) return;
    const progressPer = Math.round((loaded * 100) / total);

    $(uploadProgressRef.current).text(`Uploading: ${bytesToSize(loaded)}/${bytesToSize(total)} (${progressPer}%)`);
    $(inputBaseRef.current).css('background-image', `linear-gradient(90deg, var(--bg-surface-hover) ${progressPer}%, var(--bg-surface-low) ${progressPer}%)`);

  }

  function clearAttachment(myRoomId) {
    if (roomId !== myRoomId) return;
    setAttachment(null);
    $(inputBaseRef.current).css('background-image', 'unset');
    $(uploadInputRef.current).val('');
  }

  function rightOptionsA11Y(A11Y) {
    const rightOptions = rightOptionsRef.current.children;
    for (let index = 0; index < rightOptions.length; index += 1) {
      rightOptions[index].tabIndex = A11Y ? 0 : -1;
    }
  }

  // CMD Stuff
  function activateCmd(prefix) {
    isCmdActivated = true;
    rightOptionsA11Y(false);
    viewEvent.emit('cmd_activate', prefix);
  }

  function deactivateCmd() {
    isCmdActivated = false;
    cmdCursorPos = null;
    rightOptionsA11Y(true);
  }

  function deactivateCmdAndEmit() {
    deactivateCmd();
    viewEvent.emit('cmd_deactivate');
  }

  function setCursorPosition(pos1, pos2) {
    return new Promise(resolve => {
      setTimeout(() => {

        const textArea = $(textAreaRef.current);

        let selectionStart = pos1;
        let selectionEnd = pos2;

        if (textArea.length > 0) {
          if (selectionStart === 'auto') selectionStart = textArea[0].selectionStart;
          if (selectionEnd === 'auto') selectionEnd = textArea[0].selectionEnd;
        }

        if (typeof selectionStart !== 'number') {

          if (textArea.length > 0) {

            textArea.focus();

            if (typeof selectionEnd !== 'number' || selectionStart === selectionEnd) textArea.get(0).setSelectionRange(selectionStart, selectionStart);
            else textArea.get(0).setSelectionRange(selectionStart, selectionEnd);

          };

          resolve(true);

        } else resolve(false);

      }, 0);
    });
  }

  function replaceCmdWith(msg, cursor, replacement) {
    if (msg === null) return null;
    const targetInput = msg.slice(0, cursor);
    const cmdParts = targetInput.match(CMD_REGEX);
    const leadingInput = msg.slice(0, cmdParts.index);
    if (replacement.length > 0) setCursorPosition(leadingInput.length + replacement.length);
    return leadingInput + replacement + msg.slice(cursor);
  }

  function firedCmd(cmdData) {

    const textArea = $(textAreaRef.current);
    const msg = textArea.val();
    textArea.val(
      `${replaceCmdWith(
        msg,
        cmdCursorPos,
        typeof cmdData?.replace !== 'undefined' ? cmdData.replace : '',
      )}${typeof cmdData?.type === 'string' && cmdData.type === 'msg' ? ' ' : ''}`
    );

    textArea.focus();

    deactivateCmd();

  }

  // Input
  function focusInput() {
    if (settings.isTouchScreenDevice) return;
    $(textAreaRef.current).focus();
  }

  // Set Reply
  function setUpReply(userId, eventId, body, formattedBody) {

    setReplyTo({ userId, eventId, body });

    roomsInput.setReplyTo(roomId, {
      userId, eventId, body, formattedBody,
    });

    focusInput();

  }

  // Effects
  useEffect(() => {

    // Events On
    roomsInput.on(cons.events.roomsInput.UPLOAD_PROGRESS_CHANGES, uploadingProgress);
    roomsInput.on(cons.events.roomsInput.ATTACHMENT_CANCELED, clearAttachment);
    roomsInput.on(cons.events.roomsInput.FILE_UPLOADED, clearAttachment);

    viewEvent.on('cmd_fired', firedCmd);

    navigation.on(cons.events.navigation.REPLY_TO_CLICKED, setUpReply);

    // Textarea
    const textArea = $(textAreaRef.current);
    if (textArea.length > 0) {
      isTyping = false;
      textArea.val(roomsInput.getMessage(roomId));
      setAttachment(roomsInput.getAttachment(roomId));
      setReplyTo(roomsInput.getReplyTo(roomId));
    }

    const textResize = () => {

      const roomInput = $('.room-input');
      if (textArea.val()?.length > 0) {
        roomInput.addClass('textarea-typing');
      } else {
        roomInput.removeClass('textarea-typing');
      }

      resizeWindowChecker();

    };
    const focusUpdate = [
      () => { $('.room-input').addClass('textarea-focus'); },
      () => { $('.room-input').removeClass('textarea-focus'); }
    ];

    // Complete
    textArea.on('focus', focusUpdate[0]).on('blur', focusUpdate[1]).on('keydown', textResize).on('keypress', textResize).on('keyup', textResize);
    return () => {

      roomsInput.removeListener(cons.events.roomsInput.UPLOAD_PROGRESS_CHANGES, uploadingProgress);
      roomsInput.removeListener(cons.events.roomsInput.ATTACHMENT_CANCELED, clearAttachment);
      roomsInput.removeListener(cons.events.roomsInput.FILE_UPLOADED, clearAttachment);

      viewEvent.removeListener('cmd_fired', firedCmd);
      navigation.removeListener(cons.events.navigation.REPLY_TO_CLICKED, setUpReply);

      const textArea2 = $(textAreaRef.current);
      textArea2.off('focus', focusUpdate[0]).off('blur', focusUpdate[1]).off('keydown', textResize).off('keypress', textResize).off('keyup', textResize);

      if (isCmdActivated) deactivateCmd();
      if (textArea2.length < 1) return;

      const msg = textArea2.val();

      textArea2.css('height', 'unset');
      $(inputBaseRef.current).css('background-image', 'unset');

      if (msg.trim() === '') {
        roomsInput.setMessage(roomId, '');
        return;
      }
      roomsInput.setMessage(roomId, msg);

    };

  }, [roomId]);

  // Send Body
  const sendBody = async (body, options) => {

    // Options
    const opt = options ?? {};

    // Is Text
    if (!opt.msgType) opt.msgType = 'm.text';

    // Markdown
    if (typeof opt.autoMarkdown !== 'boolean') opt.autoMarkdown = true;

    // Is Seding?
    if (roomsInput.isSending(roomId)) return;

    // Cancel Typing Warn
    if (!checkTypingPerm()) sendIsTyping(false);

    // Set Message
    roomsInput.setMessage(roomId, body);

    // Prepare Files
    if (attachment !== null) {
      roomsInput.setAttachment(roomId, attachment);
    }

    // Prepare Message
    const textArea = $(textAreaRef.current);
    textArea.prop('disabled', true).css('cursor', 'not-allowed');

    // Send Input
    await roomsInput.sendInput(roomId, opt).catch(err => {
      toast(err.message);
    });

    // CSS
    textArea.prop('disabled', false).css('cursor', 'unset');
    focusInput();

    // Get Room ID
    textArea.val(roomsInput.getMessage(roomId)).css('height', 'unset');

    // Reply Fix
    if (replyTo !== null) setReplyTo(null);

  };

  // Command
  const processCommand = (cmdBody) => {

    const spaceIndex = cmdBody.indexOf(' ');
    const cmdName = cmdBody.slice(1, spaceIndex > -1 ? spaceIndex : undefined);
    const cmdData = spaceIndex > -1 ? cmdBody.slice(spaceIndex + 1) : '';

    if (!commands[cmdName]) {
      confirmDialog('Invalid Command', `"${cmdName}" is not a valid command.`, 'Alright');
      return;
    }

    if (typeof commands[cmdName].type === 'string') {
      if (commands[cmdName].type === 'msg') {
        commands[cmdName].exe(roomId, cmdData, sendBody);
        return;
      }
    }

    commands[cmdName].exe(roomId, cmdData);

  };

  // Send Message
  const sendMessage = async () => {

    // Animation
    requestAnimationFrame(() => deactivateCmdAndEmit());

    // Message Body
    const textArea = $(textAreaRef.current);
    const msgBody = textArea.val().trim();

    // This is command!
    if (msgBody.startsWith('/')) {
      processCommand(msgBody.trim());
      textArea.val('');
      textArea.css('height', 'unset');
      return;
    }

    // Send Body
    if (msgBody === '' && attachment === null) return;
    $('.room-input').removeClass('textarea-typing');
    sendBody(msgBody);

  };

  // Sticker
  const handleSendSticker = async (data) => {
    roomsInput.sendSticker(roomId, data);
  };

  // Typing Progress
  function processTyping(msg) {
    if (!checkTypingPerm()) {

      const isEmptyMsg = msg === '';

      if (isEmptyMsg && isTyping) {
        sendIsTyping(false);
        return;
      }

      if (!isEmptyMsg && !isTyping) {
        sendIsTyping(true);
      }

    }
  }

  // Get Cursor
  function getCursorPosition() {
    return textAreaRef.current.selectionStart;
  }

  // Cmd
  function recognizeCmd(rawInput) {

    const cursor = getCursorPosition();
    const targetInput = rawInput.slice(0, cursor);

    const cmdParts = targetInput.match(CMD_REGEX);
    if (cmdParts === null) {
      if (isCmdActivated) deactivateCmdAndEmit();
      return;
    }

    const cmdPrefix = cmdParts[1];
    const cmdSlug = cmdParts[2];

    if (cmdPrefix === ':') {
      // skip emoji autofill command if link is suspected.
      const checkForLink = targetInput.slice(0, cmdParts.index);
      if (checkForLink.match(/(http|https|mailto|matrix|ircs|irc|ftp|ipfs|bitcoin|twitter|dogecoin|ethereum|monero|web3|ar|lbry|steam)$/)) {
        deactivateCmdAndEmit();
        return;
      }
    }

    cmdCursorPos = cursor;
    if (cmdSlug === '') {
      activateCmd(cmdPrefix);
      return;
    }

    if (!isCmdActivated) activateCmd(cmdPrefix);
    viewEvent.emit('cmd_process', cmdPrefix, cmdSlug);

  }

  // Msg Typing
  const handleMsgTyping = (e) => {
    const msg = e.target.value;
    recognizeCmd(e.target.value);
    if (!isCmdActivated) processTyping(msg);
  };

  // Keydown
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      roomsInput.cancelReplyTo(roomId);
      setReplyTo(null);
    }
    if (e.key === 'Enter' && e.shiftKey === false && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle Paste
  const handlePaste = (e) => {
    if (e.clipboardData === false) {
      return;
    }

    if (e.clipboardData.items === undefined) {
      return;
    }

    for (let i = 0; i < e.clipboardData.items.length; i += 1) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        const image = item.getAsFile();
        if (attachment === null) {
          setAttachment(image);
          if (image !== null) {
            roomsInput.setAttachment(roomId, image);
            return;
          }
        } else {
          return;
        }
      }
    }
  };

  // Add Emoji Function
  function addEmoji(emoji) {

    let textArea = $(textAreaRef.current);
    const tinyEditText = $('.message__edit textarea');
    if (tinyEditText.length > 0) textArea = tinyEditText;

    if (textArea.length > 0) {

      let selectionStart = 0;
      let selectionEnd = 0;

      if (textArea.length > 0) {
        selectionStart = textArea[0].selectionStart;
        selectionEnd = textArea[0].selectionEnd;
      }

      textArea.focus();

      if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') {

        let part1 = textArea.val().substring(0, selectionStart);
        let part2 = textArea.val().substring(selectionEnd, textArea.val().length);

        if (part1.endsWith(':')) {
          part1 += ' ';
          selectionStart++;
        }

        if (part2.startsWith(':')) {
          part2 = ` ${part2}`;
          selectionEnd++;
        }

        textArea.val(part1 + emoji.unicode + part2);

        textAreaRef.current.selectionStart = selectionStart + emoji.unicode.length;
        textAreaRef.current.selectionEnd = selectionStart + emoji.unicode.length;

      } else {
        textArea.val(`${textArea.val()}${emoji.unicode}`);
      }

      textArea.focus();

    }
  }

  const handleUploadClick = () => {
    if (attachment === null) $(uploadInputRef.current).trigger('click');
    else {
      roomsInput.cancelAttachment(roomId);
    }
  };

  function uploadFileChange(e) {
    const file = e.target.files.item(0);
    setAttachment(file);
    if (file !== null) roomsInput.setAttachment(roomId, file);
  }

  // Render Inputs
  function renderInputs() {

    // Check Perm
    const canISend = getCurrentState(roomTimeline.room).maySendMessage(mx.getUserId());
    const tombstoneEvent = getCurrentState(roomTimeline.room).getStateEvents('m.room.tombstone')[0];

    // Nope
    if (!canISend || tombstoneEvent) {
      return (
        <Text className="room-input__alert">
          {
            tombstoneEvent
              ? tombstoneEvent.getContent()?.body ?? 'This room has been replaced and is no longer active.'
              : 'You do not have permission to post to this room'
          }
        </Text>
      );
    }

    setTimeout(() => $('#message-textarea').focus(), 100);

    // Complete
    return (
      <>

        <div id="chat-textarea-options" className={`room-input__option-container${attachment === null ? '' : ' room-attachment__option'}`}>
          <input onChange={uploadFileChange} style={{ display: 'none' }} ref={uploadInputRef} type="file" />
          <IconButton id="room-file-upload" onClick={handleUploadClick} tooltip={attachment === null ? 'Upload' : 'Cancel'} fa="fa-solid fa-circle-plus" />
          <IconButton className='d-none' id="room-more-textarea" onClick={() => { $('.room-input').removeClass('textarea-typing'); }} tooltip='More' fa="fa-solid fa-angle-right" />
        </div>

        <div ref={inputBaseRef} className="room-input__input-container">
          {roomTimeline.isEncrypted() && <RawIcon size="extra-small" fa="bi bi-shield-lock-fill" />}
          <ScrollView autoHide>
            <Text className="room-input__textarea-wrapper">
              <TextareaAutosize
                dir="auto"
                id="message-textarea"
                ref={textAreaRef}
                onChange={handleMsgTyping}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
              />
            </Text>
          </ScrollView>
        </div>

        <div ref={rightOptionsRef} id="chat-textarea-actions" className="room-input__option-container">

          <IconButton
            id='sticker-opener'
            onClick={(e) => {

              const cords = getEventCords(e);
              cords.x -= (document.dir === 'rtl' ? -80 : 280);
              cords.y -= 460;

              cords.y += 220;

              openEmojiBoard(roomId, cords, 'sticker', data => {

                handleSendSticker({
                  body: data.unicode.substring(1, data.unicode.length - 1),
                  httpUrl: mx.mxcUrlToHttp(data.mxc),
                  mxc: data.mxc
                });

                shiftNuller(() => e.target.click());

              });

            }}
            tooltip="Sticker"
            fa="fa-solid fa-note-sticky"
          />

          <IconButton
            id='emoji-opener'
            onClick={(e) => {

              const cords = getEventCords(e);
              cords.x -= (document.dir === 'rtl' ? -80 : 280);
              cords.y -= 460;

              if (window.matchMedia('screen and (max-width: 479px)').matches) {
                cords.x -= 50;
              }

              const tabNewSpace = $('.room-view__sticky').height(true) - 84;
              cords.y += 220;

              if (tabNewSpace > 0) { cords.y -= tabNewSpace - 60; }

              openEmojiBoard(roomId, cords, 'emoji', emoji => {
                addEmoji(emoji);
                shiftNuller(() => e.target.click());
              });

            }}
            tooltip="Emoji"
            fa="fa-solid fa-face-smile"
          />

          <IconButton
            id='audio-sender'
            ref={recAudioRef}
            tooltip="Send Audio"
            fa="fa-solid fa-microphone"
          >
            <time className='very-small ps-2 d-none' />
          </IconButton>

          <IconButton id='send-room-message' onClick={sendMessage} tooltip="Send" fa="fa-solid fa-paper-plane" />

        </div>

      </>
    );
  }

  // Insert File
  function attachFile() {

    const fileType = attachment.type.slice(0, attachment.type.indexOf('/'));
    $('#message-textarea').focus();

    return (
      <div className="room-attachment">
        <div className={`room-attachment__preview${fileType !== 'image' ? ' room-attachment__icon' : ''}`}>
          {fileType === 'image' && <img alt={attachment.name} src={URL.createObjectURL(attachment)} />}
          {fileType === 'video' && <RawIcon fa="fa-solid fa-film" />}
          {fileType === 'audio' && <RawIcon fa="fa-solid fa-volume-high" />}
          {fileType !== 'image' && fileType !== 'video' && fileType !== 'audio' && <RawIcon fa="fa-solid fa-file" />}
        </div>
        <div className="room-attachment__info">
          <Text variant="b1">{attachment.name}</Text>
          <div className="very-small text-gray"><span ref={uploadProgressRef}>{`size: ${bytesToSize(attachment.size)}`}</span></div>
        </div>
      </div>
    );
  }

  // File Reply
  function attachReply() {
    return (
      <div className="room-reply">
        <IconButton
          onClick={() => {
            roomsInput.cancelReplyTo(roomId);
            setReplyTo(null);
          }}
          fa="fa-solid fa-xmark"
          tooltip="Cancel reply"
          size="extra-small"
        />
        <MessageReply
          userId={replyTo.userId}
          onKeyDown={handleKeyDown}
          name={getUsername(replyTo.userId)}
          color={colorMXID(replyTo.userId)}
          body={replyTo.body}
        />
      </div>
    );
  }

  // Complete
  return (
    <>
      {replyTo !== null && attachReply()}
      {attachment !== null && attachFile()}
      <form ref={refRoomInput} className="room-input" onSubmit={(e) => { e.preventDefault(); }}>
        {
          renderInputs()
        }
      </form>
    </>
  );

}
// ================================ End Script

// Room View PropTypes
RoomViewInput.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewInput;
