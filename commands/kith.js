'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('kith')
  .setDescription('Give your fave a little kith')
  .addUserOption((option) =>
    option
      .setName('kithee')
      .setDescription('The player you want to kith')
      .setRequired(true),
  );

async function execute(interaction, user) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }

  const targetKithee = interaction.options.getUser(`kithee`).id;

  const kithes = await gameInfo.get('kithes');

  if (interaction.user.id in kithes) {
    if (targetKithee in kithes[interaction.user.id]) {
      kithes[interaction.user.id][targetKithee] += 1;
    } else {
      kithes[interaction.user.id][targetKithee] = 1;
    }
  } else {
    kithes[interaction.user.id] = {};
    kithes[interaction.user.id][targetKithee] = 1;
  }

  await gameInfo.set('kithes', kithes);

  if (targetKithee === interaction.guild.members.me.id) {
    if (targetKithee in kithes) {
      kithes[targetKithee] += 1;
    } else {
      kithes[targetKithee] = 1;
    }
    await gameInfo.set('kithes', kithes);
    return interaction.reply({
      content: `Wow, <@${interaction.user.id}> has given <@${targetKithee}> a kith! This is kith #${kithes[interaction.user.id][targetKithee]} from this user, bringing <@${[targetKithee]}> up to ${kithes[targetKithee]} total.`,
      ephemeral: false,
    });
  }

  if (
    kithes[interaction.user.id][targetKithee] &&
    kithes[targetKithee] &&
    kithes[targetKithee][interaction.user.id]
  ) {
    if (
      (kithes[interaction.user.id][targetKithee] === 1 &&
        kithes[targetKithee][interaction.user.id] >= 1) ||
      (kithes[interaction.user.id][targetKithee] >= 1 &&
        kithes[targetKithee][interaction.user.id] === 1)
    ) {
      return interaction.reply({
        content: `Wow, <@${interaction.user.id}> and <@${targetKithee}> just kithed... So cute.`,
        ephemeral: false,
      });
    } else if (
      kithes[interaction.user.id][targetKithee] +
        kithes[targetKithee][interaction.user.id] ===
      20
    ) {
      return interaction.reply({
        content: `OK <@${interaction.user.id}> and <@${targetKithee}> just get married already!`,
        ephemeral: false,
      });
    } else if (
      kithes[interaction.user.id][targetKithee] +
        kithes[targetKithee][interaction.user.id] >
      20
    ) {
      return interaction.reply({
        content: `OK that's enough kithes for <@${targetKithee}>.`,
        ephemeral: true,
      });
    } else if (
      kithes[interaction.user.id][targetKithee] > 1 &&
      kithes[targetKithee][interaction.user.id] > 1
    ) {
      return interaction.reply({
        content: `<@${interaction.user.id}> has given <@${targetKithee}> kith #${kithes[interaction.user.id][targetKithee]}...`,
        ephemeral: false,
      });
    }
  } else {
    return interaction.reply({
      content: `You sent a kith to <@${targetKithee}>... I wonder if they will send one too...`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
