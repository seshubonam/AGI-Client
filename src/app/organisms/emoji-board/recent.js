import initMatrix from '../../../client/initMatrix';
import { emojis } from './emoji';

const eventType = 'io.pony.house.recent_';

function getEmojisListRaw(type) {
  return initMatrix.matrixClient.getAccountData(eventType + type)?.getContent() ?? { recent_emoji: [], fav_emoji: [] };
}

export function getEmojisList(limit, where, type) {
  const res = [];
  getEmojisListRaw(type)[where]
    .sort((a, b) => b[1] - a[1])
    .find(([emojiData]) => {

      let emoji;

      if (!emojiData.isCustom) {
        emoji = emojis.find((e) => e.unicode === emojiData.unicode);
      } else {
        emoji = emojis.find((e) => e.mxc === emojiData.mxc);
      }

      if (emoji) return res.push(emoji) >= limit;

      return false;

    });
  return res;
}

export function addToEmojiList(emojiData, where, type) {

  const recent = getEmojisListRaw(type);
  const i = recent[where].findIndex(([u]) => u && u.isCustom === emojiData.isCustom && u.mxc === emojiData.mxc && u.unicode === emojiData.unicode);

  let entry;

  if (i < 0) {
    entry = [emojiData, 1];
  } else {
    [entry] = recent[where].splice(i, 1);
    entry[1] += 1;
  }
  recent[where].unshift(entry);

  recent[where] = recent[where].slice(0, 100);
  initMatrix.matrixClient.setAccountData(eventType + type, recent);

}

export function removeToEmojiList(emojiData, where, type) {

  const recent = getEmojisListRaw(type);

  let index = 0;
  while (index > -1) {
    index = recent[where].findIndex(([u]) => u && u.isCustom === emojiData.isCustom && u.mxc === emojiData.mxc && u.unicode === emojiData.unicode);
    if (index > -1) {
      recent[where].splice(index, 1);
    }
  }

  initMatrix.matrixClient.setAccountData(eventType + type, recent);

}