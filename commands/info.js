'use strict';

const {
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Show information about available commands');

async function execute(interaction, user) {
  const embed = new EmbedBuilder()
    .setTitle('Commands')
    .addFields(
      {
        name: '/in',
        value:
          'This gets you in the game lobby',
      },
      {
        name: '/out',
        value:
          'This removes you from the lobby',
      },
      {
        name: '/ready',
        value:
          "Once the lobby hits max players, use this to ready up",
      },
      {
        name: '/reg',
        value:
          "Register a channel as your private channel for games",
      },
      {
        name: '/pick',
        value:
          "Pick players to go on your mission",
      },
      {
        name: '/vote',
        value:
          "Vote on the possible missions (can be pre-submitted)",
      },
      {
        name: '/unvote',
        value:
          "Unvote on the possible missions",
      },
      {
        name: '/mission',
        value:
          "Decide whether to succeed or fail an upcoming mission (can be pre-submitted)",
      },
      {
        name: '/ref',
        value:
          "Pick a player to use the Ref of the Rain card on",
      },
      {
        name: '/claim',
        value:
          'Claim the result of the Ref of the Rain card',
      },
      {
        name: '/witch',
        value:
          "Pick a player to Witch guess",
      },
      {
        name: '/assassin',
        value:
          "Pick a player (or players) to assassinate",
      },
      {
        name: '/gamestate',
        value:
          "View the current gamestate",
      },
      {
        name: '/votestate',
        value:
          "View a mission's pick/vote summary",
      },
      {
        name: '/proxy[action]',
        value:
          "Perform a proxy action for a cospy",
      },
      {
        name: '/ascend',
        value:
          "Ascend to Res Heaven",
      },
      {
        name: '/kiss',
        value:
          'Kiss!',
      },
      {
        name: '/info',
        value:
          'Show this help message.',
      }
    );

  await interaction.reply({
    embeds: [embed],
  });
}

module.exports = {
  data,
  execute,
};