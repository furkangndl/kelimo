import { gsap } from 'gsap';

/** Card "stamps" onto the page: quick drop with a small tilt. */
export const useStamp = (target: Ref<HTMLElement | undefined>) => {
  onMounted(() => {
    gsap.from(target.value!, { y: -40, rotate: -3, opacity: 0, duration: 0.55, ease: 'back.out(1.8)' });
  });
};
