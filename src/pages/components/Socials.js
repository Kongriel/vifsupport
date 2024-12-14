import React from "react";
import Link from "next/link";

const Socials = () => {
  return (
    <div className="socials-wrapper">
      <div className="flex justify-center gap-2">
        <button onClick={() => (window.location.href = "https://www.facebook.com/ValbyIF")} className="button" aria-label="Besøg os på Facebook">
          <svg fill="#ffff" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xmlSpace="preserve" className="facebook-icon">
            <g>
              <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"></path>
              <path d="M146.8,313.7c10.3,0,21.3,3.2,21.3,3.2l6.6-39.2c0,0-14-4.8-47.4-4.8c-20.5,0-32.4,7.8-41.1,19.3 c-8.2,10.9-8.5,28.4-8.5,39.7v25.7H51.2v38.3h26.5v133h49.6v-133h39.3l2.9-38.3h-42.2v-29.9C127.3,317.4,136.5,313.7,146.8,313.7z"></path>
            </g>
          </svg>
        </button>

        <button onClick={() => (window.location.href = "https://www.instagram.com/valbyif/")} className="button" aria-label="Besøg os på Instagram">
          <svg viewBox="0 0 24 24" fill="none" height={24} width={24} xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-6 h-6 text-gray-800 dark:text-white">
            <path clipRule="evenodd" d="M3 8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Zm5-3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Zm7.597 2.214a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2h-.01a1 1 0 0 1-1-1ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-5 3a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z" fillRule="evenodd" fill="currentColor" />
          </svg>
        </button>

        <button className="button" aria-label="Besøg os på YouTube">
          <svg viewBox="0 0 24 24" fill="currentColor" height={24} width={24} xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-6 h-6 text-gray-800 dark:text-white">
            <path clipRule="evenodd" d="M21.7 8.037a4.26 4.26 0 0 0-.789-1.964 2.84 2.84 0 0 0-1.984-.839c-2.767-.2-6.926-.2-6.926-.2s-4.157 0-6.928.2a2.836 2.836 0 0 0-1.983.839 4.225 4.225 0 0 0-.79 1.965 30.146 30.146 0 0 0-.2 3.206v1.5a30.12 30.12 0 0 0 .2 3.206c.094.712.364 1.39.784 1.972.604.536 1.38.837 2.187.848 1.583.151 6.731.2 6.731.2s4.161 0 6.928-.2a2.844 2.844 0 0 0 1.985-.84 4.27 4.27 0 0 0 .787-1.965 30.12 30.12 0 0 0 .2-3.206v-1.516a30.672 30.672 0 0 0-.202-3.206Zm-11.692 6.554v-5.62l5.4 2.819-5.4 2.801Z" fillRule="evenodd" />
          </svg>
        </button>
      </div>
      <style jsx>{`
        .button {
          cursor: pointer;
          width: 50px;
          height: 50px;
          border-radius: 50px;
          border: none;

          position: relative;
          z-index: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 10px;
          transition: 0.1s;
        }
        .button svg {
          color: white;
          width: 30px;
          height: 30px;
          z-index: 9;
        }
        .button:nth-child(1) {
          background: #1877f2;
        }

        .button:nth-child(2) {
          background: linear-gradient(120deg, #833ab4, #fd1d1d, #fcb045);
        }

        .button:nth-child(3) {
          background: red;
        }

        .button:active {
          transform: scale(0.85);
        }

        .button::before {
          content: "";
          position: absolute;
          width: 55px;
          height: 55px;
          background-color: #212121;
          border-radius: 50px;
          z-index: -1;
          border: 0px solid rgba(255, 255, 255, 0.411);
          transition: 0.4s;
        }

        .button:hover::before {
          width: 0px;
          height: 0px;
        }
      `}</style>
    </div>
  );
};

export default Socials;
