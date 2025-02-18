import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { objType } from 'for-promise/utils/lib.mjs';
import settings from '@src/client/state/settings';
import { canSupport } from '@src/util/matrixUtil';

import * as linkify from 'linkifyjs';

import { tinyPrompt } from '@src/util/tools';
import { getCurrentState } from '@src/util/matrixUtil';
import Button from '@src/app/atoms/button/Button';

import { forceUnloadedAvatars } from '../../atoms/avatar/load';
import { twemojifyReact } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import {
  toggleRoomSettings,
  openReusableContextMenu,
  openNavigation,
  selectRoomMode,
  selectRoom,
} from '../../../client/action/navigation';
import {
  toggleNavigationSidebarHidden,
  togglePeopleDrawer /* , startVoiceChat */,
} from '../../../client/action/settings';
import { colorMXID } from '../../../util/colorMXID';
import { getEventCords } from '../../../util/common';

import { tabText } from './RoomSettings';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import { Header } from '../../atoms/header/Header';
import Avatar from '../../atoms/avatar/Avatar';
import RoomOptions from '../../molecules/room-options/RoomOptions';

import { useForceUpdate } from '../../hooks/useForceUpdate';
import copyText from '../profile-viewer/copyText';

import { openPinMessageModal } from '../../../util/libs/pinMessage';
import { openThreadsMessageModal } from '../../../util/libs/thread';
import { getRoomInfo } from './Room';

function RoomViewHeader({ roomId, threadId, roomAlias, roomItem, disableActions = false }) {
  const [, forceUpdate] = useForceUpdate();
  const mx = initMatrix.matrixClient;
  const isDM = initMatrix.roomList && initMatrix.roomList.directs.has(roomId);
  const room = !roomItem ? mx.getRoom(roomId) : roomItem;

  const [isIconsColored, setIsIconsColored] = useState(settings.isSelectedThemeColored());
  settings.isThemeColoredDetector(useEffect, setIsIconsColored);

  const getAvatarUrl = () =>
    isDM
      ? room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 36, 36, 'crop')
      : room.getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
  const [avatarSrc, setAvatarSrc] = useState(getAvatarUrl());
  const [roomName, setRoomName] = useState(roomAlias || room.name);

  const roomInfoUpdate = () => {
    const newAvatar = getAvatarUrl();
    const newName = roomAlias || room.name;
    if (avatarSrc !== newAvatar) setAvatarSrc(newAvatar);
    if (roomName !== newName) setRoomName(newName);
  };

  roomInfoUpdate();

  const roomHeaderBtnRef = useRef(null);
  useEffect(() => {
    const settingsToggle = (isVisible) => {
      if (roomHeaderBtnRef.current) {
        const rawIcon = roomHeaderBtnRef.current.lastElementChild;
        rawIcon.style.transform = isVisible ? 'rotateX(180deg)' : 'rotateX(0deg)';
      }
    };

    navigation.on(cons.events.navigation.ROOM_SETTINGS_TOGGLED, settingsToggle);
    navigation.on(cons.events.navigation.ROOM_INFO_UPDATED, roomInfoUpdate);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SETTINGS_TOGGLED, settingsToggle);
      navigation.removeListener(cons.events.navigation.ROOM_INFO_UPDATED, roomInfoUpdate);
    };
  }, []);

  useEffect(() => {
    const { roomList } = initMatrix;
    const handleProfileUpdate = (rId) => {
      forceUnloadedAvatars();
      if (roomId !== rId) return;
      forceUpdate();
    };

    forceUnloadedAvatars();
    if (roomList) {
      roomList.on(cons.events.roomList.ROOM_PROFILE_UPDATED, handleProfileUpdate);
      return () => {
        roomList.removeListener(cons.events.roomList.ROOM_PROFILE_UPDATED, handleProfileUpdate);
      };
    }
  }, [roomId]);

  if (!room) {
    console.warn(`RoomViewHeader: Room ${roomId} not found`);
    return null;
  }

  const openRoomOptions = (e) => {
    openReusableContextMenu('bottom', getEventCords(e, '.ic-btn'), (closeMenu) => (
      <RoomOptions roomId={roomId} threadId={threadId} afterOptionSelect={closeMenu} />
    ));
  };

  //       <IconButton className="room-header__drawer-btn" onClick={startVoiceChat} tooltip="Start VC" fa="fa-solid fa-phone" />

  setTimeout(forceUnloadedAvatars, 200);
  const navigationSidebarCallback = () => {
    if (!threadId) {
      if (window.matchMedia('screen and (max-width: 768px)').matches) {
        selectRoomMode('navigation');
        openNavigation();
      } else {
        toggleNavigationSidebarHidden();
      }
    } else {
      selectRoom(roomId);
    }
  };

  // pixx.co.settings.embeds
  const [pixxEmbeds, setPixxEmbeds] = useState({});
  const [expandPixxIframe, setExpandPixxIframe] = useState(false);
  useEffect(() => {
    const handleEvent = (event) => {
      if (event.getType() !== 'pixx.co.settings.embeds') return;
      setPixxEmbeds({ data: newEvent.getContent() ?? {}, roomId });
    };

    if (pixxEmbeds.roomId !== roomId) {
      setPixxEmbeds({
        data:
          getCurrentState(room).getStateEvents('pixx.co.settings.embeds')[0]?.getContent() ?? {},
        roomId,
      });
    }

    mx.on('RoomState.events', handleEvent);
    return () => {
      mx.removeListener('RoomState.events', handleEvent);
    };
  });

  const pixxEmbedVisible =
    objType(pixxEmbeds.data, 'object') &&
    pixxEmbeds.roomId === roomId &&
    pixxEmbeds.data.visible &&
    typeof pixxEmbeds.data.value === 'string' &&
    linkify.test(pixxEmbeds.data.value) &&
    (pixxEmbeds.data.value.startsWith('http://') || pixxEmbeds.data.value.startsWith('https://'));

  const thread = threadId ? getRoomInfo().roomTimeline.room.getThread(threadId) : null;
  const contentThread = thread && thread.rootEvent ? thread.rootEvent.getContent() : null;

  return (
    <>
      <Header>
        <ul className="navbar-nav mr-auto">
          {!disableActions ? (
            <li className="nav-item back-navigation">
              <IconButton
                className="nav-link nav-sidebar-1"
                fa={`fa-solid ${!threadId ? 'fa-chevron-left' : 'fa-arrow-right-from-bracket'}`}
                tooltip={!threadId ? 'Navigation sidebar' : 'Back to Room'}
                tooltipPlacement="bottom"
                onClick={navigationSidebarCallback}
              />
              <IconButton
                className="nav-link nav-sidebar-2"
                fa={`fa-solid ${!threadId ? 'fa-chevron-right' : 'fa-arrow-right-from-bracket'}`}
                tooltip={!threadId ? 'Navigation sidebar' : 'Back to Room'}
                tooltipPlacement="bottom"
                onClick={navigationSidebarCallback}
              />
            </li>
          ) : null}

          <li className="nav-item avatar-base">
            {!disableActions ? (
              <button
                className="nav-link btn btn-bg border-0 p-1"
                onClick={() => toggleRoomSettings()}
                type="button"
              >
                <Avatar
                  className="d-inline-block me-2 profile-image-container"
                  imageSrc={avatarSrc}
                  text={roomName}
                  bgColor={colorMXID(roomId)}
                  size="small"
                  isDefaultImage
                />
                <span className="me-2 text-truncate d-inline-block room-name">
                  {twemojifyReact(roomName)}
                  {objType(contentThread, 'object') ? (
                    <strong className="ms-2">
                      {twemojifyReact(` -- ${contentThread.pain || contentThread.body}`)}
                    </strong>
                  ) : null}
                </span>
                <RawIcon fa="fa-solid fa-chevron-down room-icon" />
              </button>
            ) : (
              <button
                className="nav-link btn btn-bg border-0 p-1"
                onClick={(event) =>
                  roomAlias
                    ? copyText(event, 'Room alias successfully copied to the clipboard.')
                    : null
                }
                style={{ pointerEvents: !roomAlias ? 'none' : null }}
                type="button"
              >
                <Avatar
                  className="d-inline-block me-2 profile-image-container"
                  imageSrc={avatarSrc}
                  text={roomName}
                  bgColor={colorMXID(roomId)}
                  size="small"
                  isDefaultImage
                />
                <span className="me-2 text-truncate d-inline-block room-name">
                  {twemojifyReact(roomName)}
                </span>
              </button>
            )}
          </li>
        </ul>

        {!disableActions ? (
          <ul className="navbar-nav ms-auto mb-0 small" id="room-options">
            <li className="nav-item">
              <IconButton
                neonColor
                iconColor={!isIconsColored ? null : 'rgb(220, 215, 41)'}
                className="nav-link btn btn-bg border-0"
                onClick={() => {
                  const agiSettings =
                    getCurrentState(room)
                      .getStateEvents('pixx.co.settings.embeds')[0]
                      ?.getContent() ?? {};

                  agiSettings.visible =
                    typeof agiSettings.visible !== 'boolean' || agiSettings.visible === false
                      ? true
                      : false;
                  setPixxEmbeds({ data: agiSettings, roomId });
                  mx.sendStateEvent(roomId, 'pixx.co.settings.embeds', agiSettings);
                }}
                tooltipPlacement="bottom"
                tooltip={`${
                  objType(pixxEmbeds.data, 'object') &&
                  pixxEmbeds.roomId === roomId &&
                  pixxEmbeds.data.visible
                    ? 'Hide'
                    : 'Show'
                } Embed`}
                fa={`fa-solid fa-${pixxEmbedVisible ? 'window-minimize' : 'window-restore'}`}
              />
            </li>
            {getCurrentState(room).maySendStateEvent('pixx.co.settings.embeds', mx.getUserId()) ? (
              <li className="nav-item">
                <IconButton
                  neonColor
                  iconColor={!isIconsColored ? null : 'rgb(41, 220, 131)'}
                  className="nav-link btn btn-bg border-0"
                  onClick={async () => {
                    const agiSettings = getCurrentState(room)
                      .getStateEvents('pixx.co.settings.embeds')[0]
                      ?.getContent();

                    const value = await tinyPrompt('Enter the embed url:', 'Embed Url', {
                      value: objType(agiSettings, 'object') ? agiSettings.value : null,
                    });
                    if (value !== null) {
                      const newEvent = { value };
                      setPixxEmbeds({ data: newEvent, roomId });
                      mx.sendStateEvent(roomId, 'pixx.co.settings.embeds', newEvent);
                    }
                  }}
                  tooltipPlacement="bottom"
                  tooltip="Embed Widget"
                  fa="fa-solid fa-plus"
                />
              </li>
            ) : null}

            {room.hasEncryptionStateEvent() === false && (
              <>
                <li className="nav-item">
                  <IconButton
                    neonColor
                    iconColor={!isIconsColored ? null : 'rgb(164, 42, 212)'}
                    className="nav-link btn btn-bg border-0"
                    onClick={() => toggleRoomSettings(tabText.SEARCH)}
                    tooltipPlacement="bottom"
                    tooltip="Search"
                    fa="fa-solid fa-magnifying-glass"
                  />
                </li>

                {canSupport('Thread') ? (
                  <li className="nav-item">
                    <IconButton
                      neonColor
                      iconColor={!isIconsColored ? null : 'rgb(41, 220, 131)'}
                      className="nav-link border-0 d-none d-sm-block"
                      onClick={() => openThreadsMessageModal(room)}
                      tooltipPlacement="bottom"
                      tooltip="Threads"
                      fa="bi bi-layers"
                    />
                  </li>
                ) : null}

                <li className="nav-item">
                  <IconButton
                    neonColor
                    iconColor={!isIconsColored ? null : 'rgb(220, 215, 41)'}
                    className="nav-link border-0 d-none d-sm-block"
                    onClick={() => openPinMessageModal(room)}
                    tooltipPlacement="bottom"
                    tooltip="Pinned Messages"
                    fa="bi bi-pin-angle-fill"
                  />
                </li>
              </>
            )}

            <li className="nav-item">
              <IconButton
                neonColor
                iconColor={!isIconsColored ? null : 'rgb(0 159 255)'}
                className="nav-link border-0 d-none d-sm-block"
                onClick={togglePeopleDrawer}
                tooltipPlacement="bottom"
                tooltip="People"
                fa="fa-solid fa-user"
              />
            </li>
            <li className="nav-item">
              <IconButton
                neonColor
                iconColor={!isIconsColored ? null : 'rgb(255	235	127)'}
                className="nav-link border-0 d-none d-sm-block"
                onClick={() => toggleRoomSettings(tabText.MEMBERS)}
                tooltipPlacement="bottom"
                tooltip="Members"
                fa="fa-solid fa-users"
              />
            </li>

            <li className="nav-item">
              <IconButton
                tooltipPlacement="bottom"
                className="nav-link border-0"
                onClick={openRoomOptions}
                tooltip="Options"
                fa="bi bi-three-dots-vertical"
              />
            </li>
          </ul>
        ) : null}
      </Header>

      {pixxEmbedVisible ? (
        <>
          <div className="spaceship-embed-expand">
            <Button
              variant="primary"
              type="button"
              faSrc="fa-solid fa-expand"
              onClick={() => setExpandPixxIframe(!expandPixxIframe)}
            />
          </div>
          <iframe
            className={`spaceship-embed${!expandPixxIframe ? '' : ' expand-embed'}`}
            alt="spaceship embed"
            src={pixxEmbeds.data.value}
          />
        </>
      ) : null}
    </>
  );
}

RoomViewHeader.propTypes = {
  roomId: PropTypes.string.isRequired,
  disableActions: PropTypes.bool,
};

export default RoomViewHeader;
