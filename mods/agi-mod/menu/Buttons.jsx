
import React from 'react';
import { btModal, objType } from '../../../src/util/tools';

import initMatrix from '../../../src/client/initMatrix';

import jReact from '../../lib/jReact';
import RawIcon from '../../../src/app/atoms/system-icons/RawIcon';

import defaultAvatar from '../../../src/app/atoms/avatar/defaultAvatar';

import * as roomActions from '../../../src/client/action/room';
import { getSelectRoom } from '../../../src/util/selectedRoom';
import { serverAddress } from '../index';

const createButton = (id, title, icon) => jReact(
    <button
        className={['sidebar-avatar', 'position-relative'].join(' ')}
        title={title}
        id={`agi-${id}`}
        type="button"
    >
        <div className='avatar-container avatar-container__normal  noselect'>

            <span
                style={{ backgroundColor: 'transparent' }}
                className='avatar__border--active'
            >
                <RawIcon fa={icon} />
            </span>

        </div>
    </button>
);

// Matrix
const mx = initMatrix.matrixClient;

export function addRoomOptions(dt, roomType) {

    // Room Options list
    const roomOptions = $('#room-options');

    // Add Special Button
    let botsMenu = roomOptions.find('#agi-bots-menu').remove();
    if (roomType === 'room') {

        // Prepare Button
        botsMenu = jReact(
            <li className='nav-item' id='agi-bots-menu' >
                <button
                    title='Add AI'
                    className={['btn', 'ic-btn', 'ic-btn-link', 'btn-bg', 'btn-link', 'btn-bg', 'btn-text-link', 'btn-bg', 'nav-link', 'border-0'].join(' ')}
                    tabIndex={0}
                    type="button"
                >
                    <RawIcon fa='bi bi-lightbulb-fill' />
                </button>
            </li>
        );

        // User Test (TESTING MODE)
        const userGenerator = (username, nickname, avatar) => $('<div>', { class: 'room-tile' }).append(

            $('<div>', { class: 'room-tile__avatar' }).append(
                $('<div>', { class: 'avatar-container avatar-container__normal  noselect' }).append(
                    $('<img>', { class: 'avatar-react img-fluid', draggable: false, src: avatar, alt: nickname }).css('background-color', 'transparent')
                )
            ),

            $('<div>', { class: 'room-tile__content emoji-size-fix' }).append(
                $('<h4>', { class: 'text text-s1 text-normal' }).text(nickname),
                $('<div>', { class: 'very-small text-gray' }).text(username)
            ),

            $('<div>', { class: 'room-tile__options' }).append(
                $('<button>', { class: 'btn btn-primary btn-sm noselect', type: 'button' }).data('pony-house-username', username).text('Invite').on('click', (event) => {

                    const userId = $(event.target).data('pony-house-username');
                    const roomId = getSelectRoom()?.roomId;

                    console.log(`Invite test to ${userId} on the room ${roomId}!`);

                    roomActions.invite(roomId, userId).catch(err => {
                        console.error(err);
                        alert(err.message);
                    });

                })
            )

        );

        // Bot List button
        botsMenu.find('> button').tooltip({ placement: 'bottom' }).on('click', () => {
            $.LoadingOverlay('show');
            fetch(`https://flow.agi.fm/api/v1/get_bots/${mx.getUserId()}`, {
                headers: {
                    'Accept': 'application/json'
                }
            }).then(res => res.json()).then(data => {

                $.LoadingOverlay('hide');
                const users = [];
                for (const item in data) {

                    try {

                        const user = mx.getUser(data[item]);
                        if (objType(user, 'object')) {
                            users.push(userGenerator(
                                user.userId,
                                user.displayName ? user.displayName : user.userId,
                                user.avatarUrl ? mx.mxcUrlToHttp(user.avatarUrl, 42, 42, 'crop') : defaultAvatar(1),
                            ));
                        } else {
                            users.push(userGenerator(data[item], data[item], defaultAvatar(1),));
                        }

                    } catch (err) {
                        console.error(err);
                        users.push(userGenerator(data[item], data[item], defaultAvatar(1),));
                    }

                }

                btModal({

                    id: 'agi-bots-menu-modal',
                    dialog: 'modal-lg',
                    title: 'Add AI bot to the room',

                    body: $('<div>', { class: 'invite-user' }).append(
                        $('<div>', { class: 'small mb-3' }).text('List of available bots to be added'),
                        $('<div>', { class: 'invite-user__content' }).append(users)
                    )

                });

            }).catch(err => {
                $.LoadingOverlay('hide');
                console.error(err);
                alert(err.message);
            });
        });

        // Append
        roomOptions.prepend(botsMenu);

    }

};

export default function buttons() {

    // Space Container
    const spaceContainer = $('.space-container');

    // Flowise
    let flowise = spaceContainer.find('#agi-flowise');
    if (flowise.length > 0) {
        flowise.remove();
    }

    // Flowise
    let superagent = spaceContainer.find('#agi-superagent');
    if (superagent.length > 0) {
        superagent.remove();
    }

    // Prepare Button
    flowise = createButton('flowise', 'AI', 'bi bi-robot');
    superagent = createButton('superagent', 'SuperAgent', 'fa-solid fa-user-ninja');

    // Add Click
    flowise.tooltip({ placement: 'right' }).on('click', () => btModal({
        id: 'agi-flowise-modal',
        dialog: 'modal-lg',
        title: 'Flowise',
        body: jReact(<iframe title='Flowise' src={serverAddress} className='w-100 height-modal-full-size' style={{ backgroundColor: '#000' }} />)
    }));

    superagent.tooltip({ placement: 'right' }).on('click', () => btModal({
        id: 'agi-superagent-modal',
        dialog: 'modal-lg',
        title: 'SuperAgent',
        body: jReact(<iframe title='Flowise' src={serverAddress} className='w-100 height-modal-full-size' style={{ backgroundColor: '#000' }} />)
    }));

    // Append
    spaceContainer.append(flowise, superagent);

};