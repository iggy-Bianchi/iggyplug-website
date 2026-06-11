/**
 * lib/clients.js
 *
 * Maps each Instagram handle to a display name for the weekly report email.
 * Reports go to Bradley + Tyler only -- Tyler forwards to the client.
 *
 * To add or remove a client, edit the CLIENTS array and deploy.
 */

const BRADLEY_EMAIL = "iggy@iggyplug.com";
const TYLER_EMAIL   = "tyler@artistformula.com"; // swap to tyler@artistformula.com after testing

const CLIENTS = [
  { handle: "lostsaintsmusic",     clientName: "Lost Saints Music"    },
  { handle: "ashlieamberofficial", clientName: "Ashlie Amber"         },
  { handle: "the_summit_band",     clientName: "The Summit Band"      },
  { handle: "timharpercaw",        clientName: "Tim Harper"           },
  { handle: "acidhawkband",        clientName: "Acid Hawk"            },
  { handle: "ariaanjali",          clientName: "Aria Anjali"          },
  { handle: "krismyersdrums",      clientName: "Kris Myers"           },
  { handle: "kittwakeley",         clientName: "Kitt Wakeley"         },
  { handle: "soleoceanna",         clientName: "Sole Oceanna"         },
  { handle: "acncountry",          clientName: "ACN Country"          },
  { handle: "happylandingxo",      clientName: "Happy Landing"        },
  { handle: "vaya.vaya_am",        clientName: "Vaya Vaya"            },
  { handle: "theromancemusic",     clientName: "The Romance"          },
  { handle: "billy.moran",         clientName: "Billy Moran"          },
  { handle: "anselbrown",          clientName: "Ansel Brown"          },
  { handle: "devongilfillian",     clientName: "Devon Gilfillian"     },
  { handle: "tylerlorettee",       clientName: "Tyler Lorettee"       },
  { handle: "theelliotposton",     clientName: "Elliot Poston"        },
  { handle: "shaneweisman",        clientName: "Shane Weisman"        },
  { handle: "bandsolstice",        clientName: "Solstice"             },
  { handle: "hickory_music",       clientName: "Hickory Music"        },
  { handle: "joey.myron",          clientName: "Joey Myron"           },
  { handle: "Alyssaannmusic",      clientName: "Alyssa Tepper"        },
  { handle: "goodtimercrds",       clientName: "Good Timer Records"   },
  { handle: "grayscalepa",         clientName: "Grayscale"            },
  { handle: "taylorhicksofficial", clientName: "Taylor Hicks"         },
  { handle: "toofinerecords_",     clientName: "Too Fine Records"     },
  { handle: "lanitasmith",         clientName: "Lanita Smith"         },
  { handle: "admiral.radio",       clientName: "Admiral Radio"        },
  { handle: "nightacclaimmusic",   clientName: "Night Acclaim"        },
  { handle: "thedirtyguvnahs",     clientName: "The Dirty Guv'nahs"   },
  { handle: "peterkeys",           clientName: "Peter Keys"           },
  { handle: "tylerbooner",         clientName: "Tyler Booner"         },
];

module.exports = { CLIENTS, TYLER_EMAIL, BRADLEY_EMAIL };
