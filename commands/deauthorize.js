'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('deauthorize')
  .setDescription('Deauthorize a user from using restricted bot commands')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to deauthorize')
      .setRequired(true),
  );

async function execute(interaction, user) {
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const targetUser = interaction.options.getUser('user');

  const authorizedUsers = (await authorizedDataSetters.get('auth')) ?? [];

  await authorized_data_setters.set(
    'auth',
    authorizedUsers.filter((x) => x !== targetUser.id),
  );

  await interaction.reply({
    content: `<@${targetUser.id}> is now deauthorized.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
