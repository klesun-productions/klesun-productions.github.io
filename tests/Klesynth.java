// plays accords with wooden pitch generation
public class Klesynth
{
	public static float SAMPLE_RATE = 8000f;

	public static void send(int tune, int msecs)
	{
		if (tune != 0) { // pauses
			new Thread(() -> {
				try {

					/** @debug - high Note-s seem to sound good, but things lower 440 are very quiet comparing to highs */
					int tune2 = tune + 24;
					// P.S. high pitches sound so angelic... =3

					// TODO: artifacts - investigate and get rid of
					// artifacts depend on some random factors, even volume!
					// if you turn off bass kolonku, artifacts ginda disappear partially
					sound(tuneToFreq(tune2), msecs, 0.8);
				} catch (LineUnavailableException exc) {
					System.out.println("I hope it not supposed to happen");
				}
			}).start();
		}
	}

	/** @return - frequency in hertzs
	  * @param - midi message tune */
	private static double tuneToFreq(int tune)
	{
		int shift = tune - Nota.LA;
		double la = 440.0;
		return la * Math.pow(2, shift / 12.0);
	}

	// written by a random guy from internets. thank you man
	private static void sound(Double hz, int msecs, double vol) throws LineUnavailableException
	{
		if (hz <= 0) throw new IllegalArgumentException("Frequency <= 0 hz");
		if (msecs <= 0) throw new IllegalArgumentException("Duration <= 0 msecs");
		if (vol > 1.0 || vol < 0.0) throw new IllegalArgumentException("Volume out of range 0.0 - 1.0");

		byte[] buf = new byte[(int) SAMPLE_RATE * msecs / 1000];

		for (int i = 0; i < buf.length; i++) {
			double angle = i / (SAMPLE_RATE / hz) * 2.0 * Math.PI;
			buf[i] = (byte) (Math.sin(angle) * 127.0 * vol);
		}

		// shape the front and back 10ms of the wave form
		for (int i = 0; i < SAMPLE_RATE / 100.0 && i < buf.length / 2; i++) {
			buf[i] = (byte) (buf[i] * i / (SAMPLE_RATE / 100.0));
			buf[buf.length - 1 - i] =
				(byte) (buf[buf.length - 1 - i] * i / (SAMPLE_RATE / 100.0));
		}

		AudioFormat af = new AudioFormat(SAMPLE_RATE, 8, 1, true, false);
		SourceDataLine sdl = AudioSystem.getSourceDataLine(af);
		sdl.open(af);
		sdl.start();
		sdl.write(buf, 0, buf.length);
		sdl.drain();
		sdl.close();
	}
}