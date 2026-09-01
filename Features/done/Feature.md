
# Feature: Video Editor with Multi Option Run
Vi bygger vidare på nuvarande video editor och gör det möjligt med multi-option runs.
En refaktorering kommer att krävas.

# Mål och Syfte
Denna video editor ska kunna göra flera FFMPEG actions i samma command, t ex trim, crop, downscale, compress.
Användaren väljer options/actions med checkbox istället för buttons.
Checkboxar kan kräva att en "config section" visas. Flera config sections kan visas samtidigt.

# Grundläggande krav
För att en multi-operation ska gå snabbast möjligt: gör INGEN re-encoding det inte krävs.
Exempel: om endast "convert -> mp4" och/eller trim, ingen re-encoding behövs!

# Ändra buttons till checkboxes
Istället för buttons, t ex Convert, Trim, etc...
Använd istället checkbox-<actionName> med label för varje action, som binds till variabler, t ex:
convertEnabled, trimEnabled, ...

# Refaktorering - boolean variables istället för Action-specific states.
Vi har skapat config-section-<action> för att fylla i parametrar. Detta är korrekt.
Men vi behöver inte längre separata action states: AppState.<Action>, t ex "AppState.Convert".
Vi har istället flera variabler som kan vara true samtidigt, och därför behöver vi kunna visa flera config sections samtidigt.
Villkoret för att visa config-section-<actionName> är att checkbox-<actionName> är true 

# Nytt state: AppState.WaitingForConfig
Vi kan behöva ett nytt state som heter AppState.WaitingForConfig som är sant när vi väntar på...
- att användaren ska checka i MINST en checkbox, om ingen är vald
- att användaren måste fylla i de parametrar som krävs för varje config sektion.

# AppState.ReadyForAction
Vi kan fortsätta använda: AppState.ReadyForAction
Det ska finnas 2 knappar: "Clear All", "Execute Action(s)".
Knappen "Execute Action(s)" är enabled endast i AppState.ReadyForAction.
Detta state är sant endast om 
- MINST en checkbox är vald 
- all information som krävs för valda actions finns
Det behövs därför någon validateActionInfo som kollar att alla checked actions innehåller de parametrar som krävs.
Exempel: om crop är enabled, validera att alla 4 parametrar finns.


# App basic flow
1. Användaren väljer video-fil.
2. Användaren fyllar i x antal checkboxes (eventuellt blir convert automatiskt ifylld om det är en webm-fil).
3. Flera config sections kan visas samtidigt, om flera checkboxes är ifyllda.
4. Användaren fyller i alla parametrar som krävs.
5. "Execute Action(s)" knappen blir nu enabled.
6. Användaren trycker "Execute Action(s)"
7. Bygg FFMPEG command baserat på alla checkboxes och parametrar som finns.

# Dest file name
Destination file name gör vi enklare denna gång, eftersom det är multi-action.
Vi kallar den <sourcerFilename>_hhmmss.mp4|webm, dvs vi lägger till enkelt timestamp.


# Definition av Options
Nedan kommer en lista av options med parametrar (mutually exclusive: 6 och 7).
Några av dem finns redan implementerade, men nu behöver vi refaktorera så att de bygger ETT command.
1. trim: <startTime>, </startTime>, välj som nu, med "set start", "set end"
2. crop: <width>, <height>, <startX>, <startY>, välj som nu, med rectangle
3. downsample, take every <nth> frame = input box, default=2
4. downscale, scale=<widthDefintion>:-1, width = input box, height auto
5. add compression with  <crf-value> = input box, default=23
6. audio remove (ta bort ljudet) ..."-an"
7. audio map (mappa nytt audio) ..."-q:a 0 -map a <myAudioFileName>", filePicker button för att välja ljudfil
8. convert: container från webm -> mp4 (default=checked)


# Default Conversion webm->mp4
Om source file är webm, default är convert till mp4, dvs kryssa i checkboxen "convert" per default.

## Exempel 1, multi action command: Kräver encoding
ffmpeg -ss <trimStartTime> -to <trimEndTime> -i <myFile.webm> -i <newAudio> \
-vf "crop=<cropwidth>:<cropheight>:<startX>:<startY>,"select='not(mod(n\,2))',setpts=N/FRAME_RATE/TB",scale=<scaleWidthX>:-1" \
-c:v libx264 -crf <compressionValue> \
-map 0:v:0 -map 1:a:0 myFile_094812.mp4

## Exempel 2, multi action command: INGEN encoding, gör copy
Ingen encoding, trimma, byt container och ta bort ljud. Vi kan lägga till "-c copy"...
ffmpeg -ss <trimStartTime> -to <trimEndTime> -i <myFile.webm> -c copy -an myFile_094812.mp4
