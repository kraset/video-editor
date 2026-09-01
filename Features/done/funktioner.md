
# Fler encoding parametrar

# Mål och Syfte
Vi ska utöka VideoEditor med fler FFmpeg-operationer och skapa mer konsekvent normaliserad video-output.
Alla operationer som innebär re-encoding ska, så långt möjligt, skapa video med samma grundläggande encoding-egenskaper.
FastTrim är uttryckligen undantagen eftersom den använder stream copy och inte får förändra videoströmmen.


# NiceTrim
NiceTrim ska alltid göras med re-encoding.
Målet är:
- frame-accurate trim
- output ska börja på timestamp 0
- första output-framen ska vara en korrekt decodbar keyframe
- standard-normalisering ska appliceras
För noggrann trim bör FFmpeg seek:a efter input-filen så att frames fram till vald starttid faktiskt avkodas.
Exempel:
ffmpeg -i input.mp4 -ss 12.500 -to 17.800 -vf "setpts=PTS-STARTPTS,setsar=1" -af "asetpts=PTS-STARTPTS" -c:v libx264 -profile:v baseline -pix_fmt yuv420p -c:a aac -video_track_timescale 30000 output.mp4


# FastTrim
Vi behåller dagens snabba trim-operation men döper den till FastTrim.
FastTrim ska använda stream copy och får inte kombineras med någon annan operation.
När FastTrim kryssas i:
Dölj/disable alla andra videooperationer
FastTrim kör ensam
ingen scaling
ingen FPS-conversion
ingen slowdown
ingen codec-normalisering
ingen SAR-normalisering
ingen re-encoding
Om någon annan operation redan är vald ska FastTrim döljas eller vara disabled.
Exempel: `ffmpeg -ss 12.5 -to 17.8 -i input.mp4 -c copy output.mp4`
Notera: Detta är avsiktligt en ugly trim. Startpunkten kan hamna på eller bero på närliggande keyframe och resultatet behöver inte ha samma normaliserade egenskaper som NiceTrim.


# Codec profile, pixel format, timescale och SAR
-c:v libx264
-profile:v baseline
-pix_fmt yuv420p
-video_track_timescale 30000
--
SAR ska alltid normaliseras till square pixels: `-vf "setsar=1"`
Exmpel: `-vf "scale=1280:-2,setpts=PTS-STARTPTS,setsar=1"`
Detta gäller bland annat NiceTrim, Scale, Slowdown, FPS-conversion och övriga operationer som kräver re-encoding.
FastTrim är undantaget.
--
Viktigt om färg
yuv420p ska betraktas som normalisering av pixel format, inte fullständig normalisering av color space.
Vi ska tills vidare inte tvinga BT.709/color primaries/color range eftersom felaktig konvertering av exempelvis mobilvideo eller HDR-material kan förändra färgerna.


# FPS
Lägg till: FPS Use source [x] Value: [ 60 ]
Use source är default true.
När Use source=true:
Value-fältet är disabled
ingen -r parameter ska skickas till FFmpeg
--
Exempel med ifylld fps: `ffmpeg -i input.mp4 -r <selectedFrameRate> ... output.mp4`
Notera: Kan innebära att FFmpeg droppar eller duplicerar frames för att skapa önskat CFR-resultat. Det ska inte förväxlas med Slowdown.


# Slowdown
Lägg till checkbox: Slowdown [ ]
När aktiverad visas: Factor: [ 2 ]
Default = 2.
Slowdown ska ändra videons timestamps:
-vf "setpts=2*PTS"
-vf "setpts=<mySlowdownValue>*PTS"
Ska applicera en sorts slow-motion, checkbox: "Slowdown", när enabled, visa inputfält, default-värde 2.
Parameter-exempel för FFMPEG.
`-vf "..., setpts=<mySlowdownValue>*PTS"`
Om flera filters används ska de kombineras i samma filter graph:
`-vf "scale=1280:-2,setpts=2*PTS,setsar=1"`
Om slowdown är aktiverat, ta bort audio.


# Scale
Vi har en option som heter Downscale, ändra namnet till Scale.
- Visa en dropdown med ett antal förvalda resolutions: [1920x1080, 1280x720, 1600x900, 640x360, Custom].
Om custom är vald, visa exempelvis följande
Width:  [ 600 ]   Height follows Aspect Ratio [ ]
Height: [ 500 ]   Width follows Aspect Ratio  [x]

Om exempelvis: Width follows Aspect Ratio [x] är valt:
- Width-input är disabled, Height styr scaling
- Width beräknas automatiskt från source aspect ratio
- det beräknade värdet visas i Width-fältet
FFmpeg kan göra motsvarande direkt med: `scale=-2:500`
... -2 betyder att FFmpeg beräknar dimensionen med bibehållen aspect ratio 
och samtidigt ser till att dimensionen blir jämnt delbar med två.
Om width styr: `scale=600:-2`
Detta är bättre än att själv göra avrundningen i UI och sedan riskera att FFmpeg får ett udda värde.

# Exakta width/height-värden vid scaling UTAN aspect ratio
Om användaren valt: en standardresolution, exempelvis 1280 × 720
eller: Custom width + custom height UTAN follows Aspect Ratio...
... så finns tre scaling modes:
(o) Scale to Width
( ) Scale to Height
( ) Scale Both
Default: Scale to Width

Användaren måste bestämma: scale på båda (vilket kan betyda deformering), eller om width eller height ska prioriteras.
- Om scale both är vald och source/width height != chosen width/height
Exempel: `-vf "scale=600:500,setsar=1"`
... skriv en varning med orange text: "Scaling both width/height may deform original video".
- Om någon av Width eller Height är ikryssad, skriv orange varning: "<Width/Height> will be <cut/padded>"
.. beroende på om padding eller cutting krävs för bredd eller höjd.

Exempel: om användaren sätter önskad storlek 600 x 500, och source videon är 800 x 400, då ska vi antingen...
a) Göra downscale på width + upscale på height... detta kommer deformera videon. Önskat i vissa fall. Skriv ut varningen.
b) Scale Width: bredd-storleken skalas ner från 800 -> 600. Det läggs till black padding centrerat ovanför och undertill.
Exempel: `-vf "scale=600:-2,pad=600:500:(ow-iw)/2:(oh-ih)/2:black,setsar=1"`
=> "Height will be padded with black on top/bottom".
c) Scale Height: höjd-storleken skalas upp från 400 -> 500. Eftersom bredden är låst till 600, cut på left/rigth sides, centered.
Exempel: `-vf "scale=-2:500,crop=600:500:(iw-600)/2:(ih-500)/2,setsar=1"`
=> "Width will be cut on left/right side, centered".

# Övrigt
- När användaren ändrar target resolution eller scaling mode bör appen använda source width/height för att i förväg räkna ut vad som kommer hända. Det här behöver alltså inte räknas ut genom att faktiskt köra FFmpeg; det kan räknas ut direkt från source-dimensionerna i TypeScript.

- Om man har valt: NiceTrim, Scale, Slowdown, FPS, ... så bör målet vara en enda re-encode, precis som tidigare, t ex:
`ffmpeg -i input.mp4 -ss 4.2 -t 3.1 -vf "scale=1280:-2,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setpts=2*PTS,setsar=1" -r 60 -c:v libx264  -profile:v baseline -pix_fmt yuv420p -video_track_timescale 30000 output.mp4`



