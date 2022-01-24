/*
 * Copyright 2003-2006,2009,2017 Ronald S. Burkey <info@sandroid.org>
 *
 * This file is part of yaAGC.
 *
 * yaAGC is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * yaAGC is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with yaAGC; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * In addition, as a special exception, Ronald S. Burkey gives permission to
 * link the code of this program with the Orbiter SDK library (or with
 * modified versions of the Orbiter SDK library that use the same license as
 * the Orbiter SDK library), and distribute linked combinations including
 * the two. You must obey the GNU General Public License in all respects for
 * all of the code used other than the Orbiter SDK library. If you modify
 * this file, you may extend this exception to your version of the file,
 * but you are not obligated to do so. If you do not wish to do so, delete
 * this exception statement from your version.
 *
 * Filename:	agc_engine_init.c
 * Purpose:	This is the function which initializes the AGC simulation,
 * 		from a file representing the binary image of core memory.
 * Compiler:	GNU gcc.
 * Contact:	Ron Burkey <info@sandroid.org>
 * Reference:	http://www.ibiblio.org/apollo/index.html
 * Mods:	04/05/03 RSB.	Began.
 *  		09/07/03 RSB.	Fixed data ordering in the core-rope image
 * 				file (to both endian CPU types to work).
 * 		11/26/03 RSB.	Up to now, a pseudo-linear space was used to
 * 				model internal AGC memory.  This was simply too
 * 				tricky to work with, because it was too hard to
 * 				understand the address conversions that were
 * 				taking place.  I now use a banked model much
 * 				closer to the true AGC memory map.
 * 		11/29/03 RSB.	Added the core-dump save/load.
 * 		05/06/04 RSB	Now use rfopen in looking for the binary.
 * 		07/12/04 RSB	Q is now 16 bits.
 * 		07/15/04 RSB	AGC data now aligned at bit 0 rathern then 1.
 * 		07/17/04 RSB	I/O channels 030-033 now default to 077777
 * 				instead of 00000, since the signals are
 * 				supposed to be inverted.
 * 		02/27/05 RSB	Added the license exception, as required by
 * 				the GPL, for linking to Orbiter SDK libraries.
 * 		05/14/05 RSB	Corrected website references.
 * 	 	07/05/05 RSB	Added AllOrErasable.
 * 		07/07/05 RSB	On a resume, now restores 010 on up (rather
 * 				than 020 on up), on Hugh's advice.
 * 		02/26/06 RSB	Various changes requested by Mark Grant
 * 				to make it easier to integrate with Orbiter.
 * 				The main change is the addition of an
 * 				agc_load_binfile function.  Shouldn't affect
 * 				non-orbiter builds.
 * 		02/28/09 RSB	Fixed some compiler warnings for 64-bit machines.
 * 		03/18/09 RSB	Eliminated periodic messages about
 * 				core-dump creation when the DebugMode
 * 				flag is set.
 * 		03/27/09 RSB	I've noticed that about half the time, using
 * 				--resume causes the DSKY to become non-responsive.
 * 				I wonder if somehow not all the state variables
 * 				are being saved, and in particular not the
 * 				state related to interrupt.  (I haven't checked
 * 				this!)  Anyhow, there are extra state variables
 * 				in the agc_t structure which aren't being
 * 				saved or restored, so I'm adding all of these.
 * 		03/30/09 RSB	Added the Downlink variable to the core dumps.
 * 		08/14/16 OH	Issue #29 fix return value of agc_engine_init.
 * 		09/30/16 MAS    Added initialization of NightWatchman.
 * 		01/04/17 MAS    Added initialization of ParityFail.
 * 		01/30/17 MAS    Added support for heuristic loading of ROM files
 *                 		produced with --hardware, by looking for any set
 *                              parity bits. If such a file is detected, parity
 *                              bit checking is enabled.
 * 		03/09/17 MAS    Added initialization of SbyStillPressed.
 * 		03/26/17 MAS    Added initialization of previously-static things
 *                              from agc_engine.c that are now in agc_t.
 * 		03/27/17 MAS    Fixed a parity-related program loading bug and
 *                              added initialization of a new night watchman bit.
 *  		04/02/17 MAS	Added initialization of a couple of flags used
 *  				for simulation of the TC Trap hardware bug.
 * 		04/16/17 MAS    Added initialization of warning filter variables.
 * 		05/16/17 MAS    Enabled interrupts at startup.
 * 		05/31/17 RSB	Added --initialize-sunburst-37.
 * 		07/13/17 MAS	Added initialization of the three HANDRUPT traps.
 * 		05/13/21 MKF	Disabled UnblockSocket for the WASI target
 *  				(there are no sockets in wasi-libc)
 */

// For Orbiter.
#ifndef AGC_SOCKET_ENABLED

#include <stdio.h>
#include <string.h>
#include "yaAGC.h"
#include "agc_engine.h"

int initializeSunburst37 = 0;


//---------------------------------------------------------------------------
// Returns:
//      0 -- success.
//      1 -- ROM image file not found.
//      2 -- ROM image file larger than core memory.
//      3 -- ROM image file size is odd.
//      4 -- agc_t structure not allocated.
//      5 -- File-read error.
//      6 -- Core-dump file not found.
// Normally, on input the CoreDump filename is NULL, in which case all of the 
// i/o channels, erasable memory, etc., are cleared to their reset values.
// When the CoreDump is loaded instead, it allows execution to continue precisely
// from the point at which the CoreDump was created, if AllOrErasable != 0.
// If AllOrErasable == 0, then only the erasable memory is initialized from the
// core-dump file.



int
agc_engine_init (agc_t * State, const char *RomImage, const char *CoreDump,
		 int AllOrErasable)
{
#if defined (WIN32) || defined (__APPLE__)  
  uint64_t lli;
#else
  unsigned long long lli;
#endif  
  int RetVal = 0, i, j, Bank;
  FILE *cd = NULL;



  // Clear i/o channels.
  for (i = 0; i < NUM_CHANNELS; i++)
    State->InputChannel[i] = 0;
  State->InputChannel[030] = 037777;
  State->InputChannel[031] = 077777;
  State->InputChannel[032] = 077777;
  State->InputChannel[033] = 077777;

  // Clear erasable memory.
  for (Bank = 0; Bank < 8; Bank++)
    for (j = 0; j < 0400; j++)
      State->Erasable[Bank][j] = 0;
  State->Erasable[0][RegZ] = 04000;	// Initial program counter.

  // Set up the CPU state variables that aren't part of normal memory.
  State->CycleCounter = 0;
  State->ExtraCode = 0;
  State->AllowInterrupt = 1; // The GOJAM sequence enables interrupts
  State->InterruptRequests[8] = 1;	// DOWNRUPT.
  //State->RegA16 = 0;
  State->PendFlag = 0;
  State->PendDelay = 0;
  State->ExtraDelay = 0;
  //State->RegQ16 = 0;

  State->OutputChannel7 = 0;
  for (j = 0; j < 16; j++)
    State->OutputChannel10[j] = 0;
  State->IndexValue = 0;
  for (j = 0; j < 1 + NUM_INTERRUPT_TYPES; j++)
    State->InterruptRequests[j] = 0;
  State->InIsr = 0;
  State->SubstituteInstruction = 0;
  State->DownruptTimeValid = 1;
  State->DownruptTime = 0;
  State->Downlink = 0;

  State->NightWatchman = 0;
  State->NightWatchmanTripped = 0;
  State->RuptLock = 0;
  State->NoRupt = 0;
  State->TCTrap = 0;
  State->NoTC = 0;
  State->ParityFail = 0;

  State->WarningFilter = 0;
  State->GeneratedWarning = 0;

  State->RestartLight = 0;
  State->Standby = 0;
  State->SbyPressed = 0;
  State->SbyStillPressed = 0;

  State->NextZ = 0;
  State->ScalerCounter = 0;
  State->ChannelRoutineCount = 0;

  State->DskyTimer = 0;
  State->DskyFlash = 0;
  State->DskyChannel163 = 0;

  State->TookBZF = 0;
  State->TookBZMF = 0;

  State->Trap31A = 0;
  State->Trap31B = 0;
  State->Trap32 = 0;

  if (initializeSunburst37)
    {
      State->Erasable[0][0067] = 077777;
      State->Erasable[0][0157] = 077777;
      State->Erasable[0][0375] = 005605;
      State->Erasable[0][0376] = 004003;
    }

  return (RetVal);
}



#endif // AGC_SOCKET_ENABLED
