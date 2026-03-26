import { ConvertToBase64WhenRelease } from "@24tools/ads_common";
import { ConvertResourceFXType, ConvertResourceType, Template3d } from "@24tools/playable_template";
import { TextureLoader } from "three";
import { ThreeC } from "../../controllers/ThreeC";

export const vfx_atlas: ConvertResourceFXType = {
    type: "fx",
    resources: [
        {
            name: "Test",
            value: [
                ConvertToBase64WhenRelease("./files/ResourseHit.webp"),
                {
                    frames_count_x: 7,
                    frames_count_y: 1,
                    frames_count_total: 7,
                    scale: { x: 2.5, y: 2.5 },
                    interval: 20,
                    alpha: 0.8,
                },
            ],
        },
        {
            name: "ResCollected",
            value: [
                ConvertToBase64WhenRelease("./files/ResourseCollected.webp"),
                {
                    frames_count_x: 7,
                    frames_count_y: 2,
                    frames_count_total: 14,
                    scale: { x: 3.5, y: 3.5 },
                    interval: 30,
                    alpha: 1,
                },
            ],
        },
        {
            name: "Break",
            value: [
                ConvertToBase64WhenRelease("./files/ZombiePunk_FX-Breaking.webp"),
                {
                    frames_count_x: 4,
                    frames_count_y: 4,
                    frames_count_total: 16,
                    scale: { x: 3.5, y: 3.5 },
                    interval: 40,
                    alpha: 1,
                },
            ],
        },
        {
            name: "Hit",
            value: [
                ConvertToBase64WhenRelease("./files/ZombiePunk_FX-Hit.webp"),
                {
                    frames_count_x: 3,
                    frames_count_y: 3,
                    frames_count_total: 9,
                    scale: { x: 3.5, y: 3.5 },
                    interval: 30,
                    alpha: 1,
                },
            ],
        },
        {
            name: "Step",
            value: [
                ConvertToBase64WhenRelease("./files/ZombiePunk_FX-CharacterStep.webp"),
                {
                    frames_count_x: 3,
                    frames_count_y: 3,
                    frames_count_total: 9,
                    scale: { x: 3.5, y: 3.5 },
                    interval: 30,
                    alpha: 1,
                },
            ],
        },
        {
            name: "Zombie_Shot",
            value: [
                ConvertToBase64WhenRelease("./files/ZombiePunk_FX-ZombieShoot.webp"),
                {
                    frames_count_x: 3,
                    frames_count_y: 3,
                    frames_count_total: 9,
                    scale: { x: 3.5, y: 3.5 },
                    interval: 30,
                    alpha: 1,
                },
            ],
        },
    ],
    loader: Template3d.fxLoader,
};
