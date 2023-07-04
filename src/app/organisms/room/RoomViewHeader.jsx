import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import { forceUnloadedAvatars } from '../../atoms/avatar/load';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { toggleRoomSettings, openReusableContextMenu, openNavigation, selectRoomMode } from '../../../client/action/navigation';
import { togglePeopleDrawer /* , startVoiceChat */ } from '../../../client/action/settings';
import { colorMXID } from '../../../util/colorMXID';
import { getEventCords } from '../../../util/common';

import { tabText } from './RoomSettings';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import { Header } from '../../atoms/header/Header';
import Avatar from '../../atoms/avatar/Avatar';
import RoomOptions from '../../molecules/room-options/RoomOptions';

import { useForceUpdate } from '../../hooks/useForceUpdate';

function RoomViewHeader({ roomId }) {

  const [, forceUpdate] = useForceUpdate();
  const mx = initMatrix.matrixClient;
  const isDM = initMatrix.roomList.directs.has(roomId);
  const room = mx.getRoom(roomId);

  let avatarSrc = room.getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
  avatarSrc = isDM ? room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 36, 36, 'crop') : avatarSrc;

  const roomName = room.name;

  useEffect(() => {
    const { roomList } = initMatrix;
    const handleProfileUpdate = (rId) => {
      forceUnloadedAvatars();
      if (roomId !== rId) return;
      forceUpdate();
    };

    forceUnloadedAvatars();
    roomList.on(cons.events.roomList.ROOM_PROFILE_UPDATED, handleProfileUpdate);
    return () => {
      roomList.removeListener(cons.events.roomList.ROOM_PROFILE_UPDATED, handleProfileUpdate);
    };
  }, [roomId]);

  const openRoomOptions = (e) => {
    openReusableContextMenu(
      'bottom',
      getEventCords(e, '.ic-btn'),
      (closeMenu) => <RoomOptions roomId={roomId} afterOptionSelect={closeMenu} />,
    );
  };

  //       <IconButton className="room-header__drawer-btn" onClick={startVoiceChat} tooltip="Start VC" fa="fa-solid fa-phone" />

  setTimeout(forceUnloadedAvatars, 200);

  return (
    <Header>

      <ul className='navbar-nav mr-auto'>

        <li className="nav-item back-navigation">
          <IconButton
            className="nav-link"
            fa="fa-solid fa-chevron-left"
            tooltip="Return to navigation"
            tooltipPlacement="bottom"
            onClick={() => {
              selectRoomMode('navigation');
              openNavigation();
            }}
          />
        </li>

        <li className="nav-item avatar-base">
          <button
            className="nav-link btn btn-bg border-0 p-1"
            onClick={() => toggleRoomSettings()}
            type="button"
          >
            <Avatar className='d-inline-block me-2' imageSrc={avatarSrc} animParentsCount={2} text={roomName} bgColor={colorMXID(roomId)} size="small" isDefaultImage />
            <span className='me-2 text-truncate d-inline-block room-name'>{twemojify(roomName)}</span>
            <RawIcon fa="fa-solid fa-chevron-down room-icon" />
          </button>
        </li>

      </ul>

      <ul className='navbar-nav ms-auto mb-0 small'>

        {mx.isRoomEncrypted(roomId) === false && (
          <li className="nav-item">
            <IconButton className="nav-link btn btn-bg border-0" onClick={() => toggleRoomSettings(tabText.SEARCH)} tooltipPlacement="bottom" tooltip="Search" fa="fa-solid fa-magnifying-glass" />
          </li>
        )}

        <li className="nav-item"><IconButton className="nav-link border-0 d-none d-sm-block" onClick={togglePeopleDrawer} tooltipPlacement="bottom" tooltip="People" fa="fa-solid fa-user" /></li>
        <li className="nav-item"><IconButton className="nav-link border-0 d-none d-sm-block" onClick={() => toggleRoomSettings(tabText.MEMBERS)} tooltipPlacement="bottom" tooltip="Members" fa="fa-solid fa-users" /></li>

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

    </Header >
  );

}
RoomViewHeader.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomViewHeader;